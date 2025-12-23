"use client";

export default function ConfirmDeleteButton({
  action,
  hiddenInputs,
  message = "정말 삭제하시겠습니까?",
  label = "삭제",
  className,
}: {
  action: string;
  hiddenInputs?: { name: string; value: string }[];
  message?: string;
  label?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      method="post"
      onSubmit={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {hiddenInputs?.map((input) => (
        <input key={input.name} type="hidden" name={input.name} value={input.value} />
      ))}
      <button
        type="submit"
        className={
          className ||
          "inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
        }
      >
        {label}
      </button>
    </form>
  );
}

export function ConfirmDeleteIconButton({
  action,
  hiddenInputs,
  message = "정말 삭제하시겠습니까?",
  title = "삭제",
}: {
  action: string;
  hiddenInputs?: { name: string; value: string }[];
  message?: string;
  title?: string;
}) {
  return (
    <form
      action={action}
      method="post"
      className="flex justify-end"
      onSubmit={(e) => {
        if (!confirm(message)) {
          e.preventDefault();
        }
      }}
    >
      {hiddenInputs?.map((input) => (
        <input key={input.name} type="hidden" name={input.name} value={input.value} />
      ))}
      <button
        type="submit"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
        title={title}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </form>
  );
}

