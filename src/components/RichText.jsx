import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
    Editor,
    EditorState,
    RichUtils,
    Modifier,
    CompositeDecorator
} from 'draft-js';
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

const Img = props => {
    const { src } = props.contentState.getEntity(props.entityKey).getData();
    return <img src={src} />;
};

function findImgEntities(contentBlock, callback) {
    callback();
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

        this.state = {
            editorState: EditorState.createEmpty(decorator)
        };
        this.refEditor = React.createRef();
        this.onChange = this.onChange.bind(this);
        this.handleKeyCommand = this.handleKeyCommand.bind(this);
    }
    onChange(editorState) {
        this.setState({
            editorState
        });
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
    onBtnUndoClick() {}
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
                    <BtnLink onClick={this.onBtnLinkClick.bind(this)} />
                    <BtnUndo onClick={this.onBtnUndoClick.bind(this)} />
                    <BtnBold onClick={this.onBtnBoldClick.bind(this)} />
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
