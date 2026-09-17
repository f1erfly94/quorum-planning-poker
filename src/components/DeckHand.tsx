"use client";

/** The cards you can play. Picking the one you already played takes it back. */
export const DeckHand = ({
    cards,
    mine,
    disabled,
    onPick,
}: {
    cards: string[];
    mine: string | null;
    disabled: boolean;
    onPick: (value: string | null) => void;
}) => (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Your card">
        {cards.map((card) => {
            const picked = card === mine;
            return (
                <button
                    key={card}
                    type="button"
                    disabled={disabled}
                    aria-pressed={picked}
                    onClick={() => onPick(picked ? null : card)}
                    className={`h-20 w-14 rounded-lg border text-lg font-semibold transition-transform duration-200 disabled:opacity-40 ${
                        picked
                            ? "-translate-y-2 border-brand bg-brand text-white"
                            : "border-line bg-surface hover:-translate-y-1 hover:border-brand"
                    }`}
                >
                    {card}
                </button>
            );
        })}
    </div>
);
