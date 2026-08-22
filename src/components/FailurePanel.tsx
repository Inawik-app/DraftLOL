type Action = {
  label: string;
  onClick: () => void;
};

type Props = {
  title: string;
  message: string;
  actions?: Action[];
};

export function FailurePanel({ title, message, actions }: Props) {
  return (
    <div className="mx-auto flex min-h-full max-w-[1240px] flex-col justify-center px-3.5 py-10">
      <div className="border border-line bg-panel p-4">
        <h1 className="font-cond text-lg tracking-[0.1em] text-txt">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-dim">{message}</p>
        {actions && actions.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="font-cond border border-line bg-panel2 px-3 py-1.5 text-[13px] tracking-[0.08em] text-txt transition hover:border-gold hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
