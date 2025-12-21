"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";

function ToolButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-9 rounded-lg border px-3 text-xs ${
        active ? "border-white/20 bg-white/15 text-white" : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  name,
  initialHTML,
  placeholder = "공지 내용을 입력하세요",
  minHeightClassName = "min-h-[320px]",
}: {
  name: string;
  initialHTML?: string | null;
  placeholder?: string;
  minHeightClassName?: string;
}) {
  const [html, setHtml] = useState<string>(initialHTML?.trim().length ? initialHTML : "<p></p>");

  const editor = useEditor({
    // Next.js(App Router) 환경에서 hydration mismatch를 피하기 위해 명시
    immediatelyRender: false,
    extensions: [
      // StarterKit에 link/underline가 포함되어 있어 중복 경고가 발생할 수 있음 → 비활성화 후 커스텀 extension 사용
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      // style 기반 기능들(색상/폰트 크기)
      TextStyle,
      Color.configure({ types: ["textStyle"] }),
      FontSize.configure({ types: ["textStyle"] }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: html,
    editorProps: {
      attributes: {
        class:
          `prose prose-invert max-w-none outline-none ` +
          `${minHeightClassName} rounded-xl border border-white/10 bg-[#29292a] px-3 py-3 text-sm text-white/90 ` +
          `focus:border-white/20 focus:ring-2 focus:ring-white/10`,
      },
    },
    onUpdate: ({ editor }) => {
      setHtml(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    // placeholder(간단 구현): 내용이 비었으면 첫 p에 data-placeholder를 붙여 CSS로 표시
    // TipTap Placeholder extension도 있지만, 의존성 최소화를 위해 간단히 처리
    const dom = editor.view.dom as HTMLElement;
    dom.setAttribute("data-placeholder", placeholder);
  }, [editor, placeholder]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL을 입력하세요", prev || "https://");
    if (url === null) return;
    const next = url.trim();
    if (!next) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: next }).run();
  }, [editor]);

  const insertImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("이미지 URL을 입력하세요", "https://");
    if (!url) return;
    editor.chain().focus().setImage({ src: url.trim() }).run();
  }, [editor]);

  const setColor = useCallback(
    (color: string) => {
      if (!editor) return;
      const c = color.trim();
      if (!c) return;
      editor.chain().focus().setColor(c).run();
    },
    [editor]
  );

  const unsetColor = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetColor().run();
  }, [editor]);

  const setFontSize = useCallback(
    (px: number) => {
      if (!editor) return;
      const v = Math.max(10, Math.min(72, Math.round(px)));
      editor.chain().focus().setFontSize(`${v}px`).run();
    },
    [editor]
  );

  const unsetFontSize = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetFontSize().run();
  }, [editor]);

  const headingLevel = useMemo(() => {
    if (!editor) return 0;
    if (editor.isActive("heading", { level: 1 })) return 1;
    if (editor.isActive("heading", { level: 2 })) return 2;
    if (editor.isActive("heading", { level: 3 })) return 3;
    return 0;
  }, [editor, html]);

  const currentTextStyle = useMemo(() => {
    if (!editor) return {};
    return (editor.getAttributes("textStyle") || {}) as { color?: string; fontSize?: string };
  }, [editor, html]);

  const currentColor = typeof currentTextStyle.color === "string" ? currentTextStyle.color : "";
  const currentFontSize = typeof currentTextStyle.fontSize === "string" ? currentTextStyle.fontSize : "";

  if (!editor) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#29292a] px-3 py-3 text-sm text-white/70">
        에디터 로딩 중…
        <input type="hidden" name={name} value={html} />
      </div>
    );
  }

  return (
    <div>
      {/* 폼 제출용 */}
      <input type="hidden" name={name} value={html} />

      {/* 툴바 */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ToolButton
          title="굵게"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          굵게
        </ToolButton>
        <ToolButton
          title="기울임"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          기울임
        </ToolButton>
        <ToolButton
          title="밑줄"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          밑줄
        </ToolButton>
        <ToolButton
          title="취소선"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          취소선
        </ToolButton>

        <div className="mx-1 h-6 w-px bg-white/10" aria-hidden="true" />

        <select
          value={String(headingLevel)}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isFinite(v) || v === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: v as 1 | 2 | 3 }).run();
          }}
          className="h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white/80 outline-none hover:bg-white/10"
          aria-label="글머리"
        >
          <option value="0">본문</option>
          <option value="1">제목 1</option>
          <option value="2">제목 2</option>
          <option value="3">제목 3</option>
        </select>

        <ToolButton
          title="글머리 목록"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          목록
        </ToolButton>
        <ToolButton
          title="번호 목록"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          번호
        </ToolButton>
        <ToolButton
          title="인용"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          인용
        </ToolButton>

        <div className="mx-1 h-6 w-px bg-white/10" aria-hidden="true" />

        <ToolButton title="링크" active={editor.isActive("link")} onClick={setLink}>
          링크
        </ToolButton>
        <ToolButton title="이미지(URL)" onClick={insertImage}>
          이미지
        </ToolButton>

        <div className="mx-1 h-6 w-px bg-white/10" aria-hidden="true" />

        {/* 폰트 크기 */}
        <select
          value={currentFontSize || ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) unsetFontSize();
            else setFontSize(Number(v.replace("px", "")));
          }}
          className="h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white/80 outline-none hover:bg-white/10"
          aria-label="폰트 크기"
        >
          <option value="">크기</option>
          {[12, 14, 16, 18, 20, 24, 28, 32].map((n) => (
            <option key={n} value={`${n}px`}>
              {n}px
            </option>
          ))}
        </select>

        {/* 폰트 색상 */}
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
          <input
            type="color"
            value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(currentColor) ? currentColor : "#ffffff"}
            onChange={(e) => setColor(e.target.value)}
            className="h-7 w-7 cursor-pointer bg-transparent"
            aria-label="폰트 색상"
          />
          <button
            type="button"
            onClick={unsetColor}
            className="text-xs text-white/70 hover:text-white"
            aria-label="색상 초기화"
          >
            초기화
          </button>
        </div>
      </div>

      {/* 에디터 */}
      <div
        className="relative"
        // 간단 placeholder 스타일(내용이 비어있을 때 첫 p에 보여주기)
      >
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
            .ProseMirror:focus { outline: none; }
            .ProseMirror p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              float: left;
              color: rgba(255,255,255,0.35);
              pointer-events: none;
              height: 0;
            }
          `,
          }}
        />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}


