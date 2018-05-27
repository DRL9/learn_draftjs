import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { convertToHTML } from 'draft-convert';
import {
    SelectionState,
    ContentState,
    getDefaultKeyBinding,
    Editor,
    EditorState,
    RichUtils,
    Modifier,
    CompositeDecorator,
    KeyBindingUtil,
    convertFromHTML,
    DefaultDraftBlockRenderMap,
    BlockMap,
    AtomicBlockUtils
} from 'draft-js';
import Immutable from 'immutable';
import './RichText.css';

function wrapButton(template) {
    return class WrapButton extends Component {
        render() {
            return (
                <button
                    className="editor-button"
                    onClick={this.props.onClick ? this.props.onClick : () => {}}
                >
                    {template}
                </button>
            );
        }
    };
}

const BtnLink = wrapButton(<span>link</span>);
const BtnUndo = wrapButton(<span>undo</span>);
const BtnBold = wrapButton(<span>bold</span>);
const BtnToHtml = wrapButton(<span>to html</span>);

const Link = props => {
    const { url } = props.contentState.getEntity(props.entityKey).getData();
    return <a href={url}>{props.children}</a>;
};
function findLinkEntities(contentBlock, callback, contentState) {
    contentBlock.findEntityRanges(character => {
        const entityKey = character.getEntity();
        return (
            entityKey !== null &&
            contentState.getEntity(entityKey).getType() === 'LINK'
        );
    }, callback);
}

const Img = props => {
    const { src } = props.contentState.getEntity(props.entityKey).getData();
    return (
        <div>
            <img src={src} />
        </div>
    );
};

function findImgEntities(contentBlock, callback, contentState) {
    contentBlock.findEntityRanges(character => {
        const entityKey = character.getEntity();
        return (
            entityKey != null &&
            contentState.getEntity(entityKey).getType() === 'IMAGE'
        );
    }, callback);
}

const HashTag = props => {
    return <span className="hash-tag">{props.children}</span>;
};
function findHashTagEntities(contentBlock, callback, contentState) {
    let reg = /#[\w\u0590-\u05ff]+/g;
    let matchArr, start;
    let text = contentBlock.getText();
    while ((matchArr = reg.exec(text)) !== null) {
        start = matchArr.index;
        callback(start, start + matchArr[0].length);
    }
}

/**
 * 自定义快捷键
 * @param {KeyboardEvent} e
 * @return {String}
 */
function myKeyBindFn(e) {
    if (e.keyCode === 83 && KeyBindingUtil.hasCommandModifier(e)) {
        return 'myeditor-save';
    }
    return getDefaultKeyBinding(e);
}

/**
 * 自定义块级元素样式（为块级元素添加 class)
 * @param {Object} contentBlock
 * @returns {String}
 */
function myBlockStyleFn(contentBlock) {
    let type = contentBlock.getType();
    console.log(type);
    if (type == '  ') {
        return 'my-div';
    }
}

const myBlockRenderMap = DefaultDraftBlockRenderMap.merge(
    Immutable.Map({
        unstyled: {
            element: 'div',
            aliasedElements: ['p']
        }
    })
);

function myBlockRenderFn(contentBlock) {
    const type = contentBlock.getType();
    console.log(type);
    if (type == 'atomic') {
        return {
            component: MediaComponent,
            editable: false,
            props: {
                foo: 'bar'
            }
        };
    }
}

class MediaComponent extends React.Component {
    render() {
        const { block, contentState } = this.props;
        const { foo } = this.props.blockProps;
        const data = contentState.getEntity(block.getEntityAt(0)).getData();
        // Return a <figure> or some other content using this data.
        return (
            <figure>
                <img src={data.src} />
            </figure>
        );
    }
}

class RichText extends Component {
    constructor(props) {
        super(props);
        const decorator = new CompositeDecorator([
            {
                component: Link,
                strategy: findLinkEntities
            },
            {
                component: HashTag,
                strategy: findHashTagEntities
            },
            {
                component: Img,
                strategy: findImgEntities
            }
        ]);

        const initHtml = `
        <p>
        <a href="www.google.com">to google</a>
        </p>
        <p>
        <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWWHJDLH243o52BuTgX32Bs_CNfIRo3zHYxCVKCqdP1gexItuYnQ"/>
        </p>
        <p>ddd</p>`;

        let { contentBlocks, entityMap } = convertFromHTML(initHtml);
        this.state = {
            // editorState: EditorState.createEmpty(decorator)
            editorState: EditorState.createWithContent(
                ContentState.createFromBlockArray(contentBlocks, entityMap),
                decorator
            )
        };
        this.refEditor = React.createRef();
        this.onChange = this.onChange.bind(this);
        this.handleKeyCommand = this.handleKeyCommand.bind(this);

        this.onBtnBoldClick = this.onBtnBoldClick.bind(this);
        this.onBtnLinkClick = this.onBtnLinkClick.bind(this);
        this.onBtnUndoClick = this.onBtnUndoClick.bind(this);
        this.onBtnTohtmlClick = this.onBtnTohtmlClick.bind(this);
    }
    onChange(editorState) {
        this.setState({
            editorState
        });
    }
    onBtnTohtmlClick() {
        let html = convertToHTML({
            styleToHTML: style => {
                if (style === 'BOLD') {
                    return <span style={{ color: 'blue' }} />;
                }
            },
            blockToHTML: block => {
                if (block.type === 'PARAGRAPH') {
                    return <p />;
                }
            },

            entityToHTML: (entity, originalText) => {
                if (entity.type === 'LINK') {
                    return <a href={entity.data.url}>{originalText}</a>;
                } else if (entity.type == 'IMAGE') {
                    return <img src={entity.data.src} />;
                }
                return originalText;
            }
        })(this.state.editorState.getCurrentContent());
        console.log(html);
    }
    onBtnLinkClick() {
        let { editorState } = this.state;
        let selection = editorState.getSelection();
        if (!selection.isCollapsed()) {
            // The anchor and focus offsets are not the same denotes that the selection has content.
            let contentState = editorState.getCurrentContent();
            let contentStateWithEntity = contentState.createEntity(
                'LINK',
                'IMMUTABLE',
                {
                    url: 'www.google.com'
                }
            );
            let entityKey = contentStateWithEntity.getLastCreatedEntityKey();

            const contentStateWithLink = Modifier.applyEntity(
                contentStateWithEntity,
                selection,
                entityKey
            );
            const newState = EditorState.set(editorState, {
                currentContent: contentStateWithLink
            });
            this.onChange(newState);

            // 使用工具函数设置
            // const newState = EditorState.set(editorState, {
            //     currentContent: contentStateWithEntity
            // });
            // this.onChange(RichUtils.toggleLink(newState, selection, entityKey));
        }
    }
    onBtnUndoClick() {
        this.onChange(EditorState.undo(this.state.editorState));
    }
    onBtnBoldClick() {
        this.onChange(
            RichUtils.toggleInlineStyle(this.state.editorState, 'BOLD')
        );
    }
    handleKeyCommand(command, editorState) {
        console.log(command, editorState);
        const newState = RichUtils.handleKeyCommand(editorState, command);
        if (newState) {
            this.onChange(newState);
            return 'handled';
        }
        return 'not-handled';
    }
    render() {
        return (
            <div className="editor">
                <div className="editor-bar">
                    <BtnLink onClick={this.onBtnLinkClick} />
                    <BtnUndo onClick={this.onBtnUndoClick} />
                    <BtnBold onClick={this.onBtnBoldClick} />
                    <BtnToHtml onClick={this.onBtnTohtmlClick} />
                </div>
                <div
                    className="editor-content"
                    onClick={() => {
                        this.refEditor.current.focus();
                    }}
                >
                    <Editor
                        ref={this.refEditor}
                        editorState={this.state.editorState}
                        handleKeyCommand={this.handleKeyCommand}
                        keyBindingFn={myKeyBindFn}
                        blockStyleFn={myBlockStyleFn}
                        blockRenderMap={myBlockRenderMap}
                        blockRendererFn={myBlockRenderFn}
                        onChange={this.onChange}
                    />
                </div>
            </div>
        );
    }
}

RichText.propTypes = {
    children: PropTypes.object
};

export default RichText;
