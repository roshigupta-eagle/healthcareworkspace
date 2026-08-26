"use client";

/**
 * Rich-text note editor built on Tiptap (MIT-licensed, ProseMirror-based)
 * — the open-source core editing engine for the unified Notes feature.
 *
 * Editing surface only: this component is intentionally unaware of
 * track-changes. It reports plain-text content (`getText`) on every
 * update so the caller (`NoteEditor`) can run it through the existing
 * word-level diff/track-changes engine (`@/notes/diffEngine`), which
 * operates on plain text. Rich formatting (bold/italic/lists/headings)
 * improves the authoring experience; the tracked-changes record itself
 * is plain text in this phase (see docs/solutioning/notes-feature/lld.md §10).
 */
import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Convert stored plain text (paragraphs separated by blank lines) into initial editor HTML. */
function plainTextToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.length > 0);
  if (paragraphs.length === 0) return "<p></p>";
  return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`).join("");
}

interface ToolbarButtonProps {
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({ label, title, active, disabled, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection/focus
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium transition disabled:opacity-30 ${
        active ? "bg-teal-600 text-white" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50 px-2 py-1">
      <ToolbarButton label="B" title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolbarButton label="I" title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolbarButton label="U" title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <ToolbarButton label="S" title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <span className="mx-1 h-4 w-px bg-gray-200" aria-hidden />
      <ToolbarButton
        label="H2"
        title="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolbarButton
        label="H3"
        title="Subheading"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />
      <span className="mx-1 h-4 w-px bg-gray-200" aria-hidden />
      <ToolbarButton label="•" title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolbarButton label="1." title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolbarButton label="❝" title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <span className="mx-1 h-4 w-px bg-gray-200" aria-hidden />
      <ToolbarButton label="↺" title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} />
      <ToolbarButton label="↻" title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} />
    </div>
  );
}

interface Props {
  initialText: string;
  editable: boolean;
  placeholder?: string;
  onChangeText: (plainText: string) => void;
  onSelectionText?: (plainText: string) => void;
}

export interface TiptapEditorHandle {
  insertText: (text: string) => void;
}

const TiptapEditor = forwardRef<TiptapEditorHandle, Props>(function TiptapEditor(
  { initialText, editable, placeholder, onChangeText, onSelectionText },
  ref
) {
  const initialHtml = useMemo(() => plainTextToHtml(initialText), [initialText]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Start typing… changes are tracked and autosaved." }),
    ],
    content: initialHtml,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChangeText(e.getText({ blockSeparator: "\n\n" }));
    },
    onSelectionUpdate: ({ editor: e }) => {
      onSelectionText?.(e.state.doc.textBetween(e.state.selection.from, e.state.selection.to, '\n\n'));
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    if (!editor) return;
    const currentText = editor.getText({ blockSeparator: "\n\n" });
    if (currentText !== initialText) {
      editor.commands.setContent(plainTextToHtml(initialText), false);
    }
  }, [editor, initialText]);

  useImperativeHandle(
    ref,
    () => ({
      insertText: (text: string) => {
        if (!editor) return;
        editor.chain().focus("end").insertContent(plainTextToHtml(text)).run();
        onChangeText(editor.getText({ blockSeparator: "\n\n" }));
      },
    }),
    [editor, onChangeText]
  );

  if (!editor) return null;

  return (
    <div className="rounded-md border border-gray-200 focus-within:ring-2 focus-within:ring-teal-200">
      {editable && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="min-h-[360px] max-h-[720px] overflow-y-auto px-4 py-4 text-[15px] leading-7 text-gray-800 [&_.ProseMirror]:min-h-[330px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-500 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold"
      />
      <div className="border-t border-gray-100 px-3 py-1 text-right text-[10px] text-gray-400">
        {editor.getText().trim() ? editor.getText().trim().split(/\s+/).filter(Boolean).length : 0} words
      </div>
    </div>
  );
});

export default TiptapEditor;

