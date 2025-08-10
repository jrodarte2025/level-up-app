import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Box, IconButton, Divider, Paper, Button } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Code,
  Link as LinkIcon,
  LinkOff,
  Undo,
  Redo,
  FormatClear
} from '@mui/icons-material';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        p: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: '#f9fafb',
        borderRadius: '8px 8px 0 0',
      }}
    >
      <IconButton
        size="small"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        color={editor.isActive('bold') ? 'primary' : 'default'}
        sx={{ 
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <FormatBold fontSize="small" />
      </IconButton>
      
      <IconButton
        size="small"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        color={editor.isActive('italic') ? 'primary' : 'default'}
        sx={{ 
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <FormatItalic fontSize="small" />
      </IconButton>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <IconButton
        size="small"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        color={editor.isActive('bulletList') ? 'primary' : 'default'}
        sx={{ 
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <FormatListBulleted fontSize="small" />
      </IconButton>

      <IconButton
        size="small"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        color={editor.isActive('orderedList') ? 'primary' : 'default'}
        sx={{ 
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <FormatListNumbered fontSize="small" />
      </IconButton>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <IconButton
        size="small"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        color={editor.isActive('blockquote') ? 'primary' : 'default'}
        sx={{ 
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <FormatQuote fontSize="small" />
      </IconButton>

      <IconButton
        size="small"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        color={editor.isActive('codeBlock') ? 'primary' : 'default'}
        sx={{ 
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <Code fontSize="small" />
      </IconButton>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <IconButton
        size="small"
        onClick={addLink}
        color={editor.isActive('link') ? 'primary' : 'default'}
        sx={{ 
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <LinkIcon fontSize="small" />
      </IconButton>

      {editor.isActive('link') && (
        <IconButton
          size="small"
          onClick={removeLink}
          sx={{ 
            borderRadius: 1,
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <LinkOff fontSize="small" />
        </IconButton>
      )}

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

      <IconButton
        size="small"
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        sx={{ 
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <FormatClear fontSize="small" />
      </IconButton>

      <Box sx={{ flexGrow: 1 }} />

      <IconButton
        size="small"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        sx={{ 
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <Undo fontSize="small" />
      </IconButton>

      <IconButton
        size="small"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        sx={{ 
          borderRadius: 1,
          '&:hover': { backgroundColor: 'action.hover' }
        }}
      >
        <Redo fontSize="small" />
      </IconButton>
    </Box>
  );
};

const RichTextEditor = ({ content, onChange, placeholder = "Write your update here..." }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: 'color: #1e40af; text-decoration: underline;',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when the content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        '&:focus-within': {
          borderColor: 'primary.main',
          boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}25`,
        },
      }}
    >
      <MenuBar editor={editor} />
      <Box
        sx={{
          minHeight: 150,
          maxHeight: 400,
          overflowY: 'auto',
          p: 2,
          '& .ProseMirror': {
            minHeight: 120,
            outline: 'none',
            '& > * + *': {
              marginTop: '0.75em',
            },
            '& p': {
              margin: 0,
              lineHeight: 1.6,
            },
            '& h1': {
              fontSize: '1.875rem',
              fontWeight: 600,
              lineHeight: 1.3,
              marginTop: 0,
              marginBottom: '0.5em',
            },
            '& h2': {
              fontSize: '1.5rem',
              fontWeight: 600,
              lineHeight: 1.3,
              marginTop: 0,
              marginBottom: '0.5em',
            },
            '& h3': {
              fontSize: '1.25rem',
              fontWeight: 600,
              lineHeight: 1.3,
              marginTop: 0,
              marginBottom: '0.5em',
            },
            '& ul, & ol': {
              paddingLeft: '1.5rem',
              margin: '0.5em 0',
            },
            '& li': {
              marginBottom: '0.25em',
            },
            '& blockquote': {
              borderLeft: '3px solid #e5e7eb',
              marginLeft: 0,
              marginRight: 0,
              paddingLeft: '1rem',
              color: '#6b7280',
              fontStyle: 'italic',
            },
            '& pre': {
              backgroundColor: '#f3f4f6',
              borderRadius: '0.375rem',
              color: '#111827',
              fontFamily: 'monospace',
              fontSize: '0.875em',
              padding: '0.75rem 1rem',
              overflowX: 'auto',
            },
            '& code': {
              backgroundColor: '#f3f4f6',
              borderRadius: '0.25rem',
              color: '#111827',
              fontFamily: 'monospace',
              fontSize: '0.875em',
              padding: '0.125rem 0.25rem',
            },
            '& a': {
              color: '#1e40af',
              textDecoration: 'underline',
              cursor: 'pointer',
              '&:hover': {
                color: '#1e3a8a',
              },
            },
            '& .is-editor-empty:first-child::before': {
              color: '#9ca3af',
              content: 'attr(data-placeholder)',
              float: 'left',
              height: 0,
              pointerEvents: 'none',
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
};

export default RichTextEditor;