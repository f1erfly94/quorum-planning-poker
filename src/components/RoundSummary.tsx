"use client";

import type {RoundSummary as Summary} from "@protocol";

export const RoundSummary = ({summary}: {summary: Summary}) => {
    const total = summary.distribution.reduce((sum, item) => sum + item.count, 0);

    return (
        <div className="card p-6">
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
                <div>
                    <p className="label">Average</p>
                    <p className="mt-1 text-3xl font-semibold">{summary.average ?? "—"}</p>
                </div>
                {summary.consensus && (
                    <p className="rounded-full bg-brand-soft px-4 py-1.5 text-sm font-medium text-brand">
                        Everyone agrees
                    </p>
                )}
            </div>

            <ul className="mt-6 flex flex-col gap-2">
                {summary.distribution.map((item) => (
                    <li key={item.value} className="flex items-center gap-3">
                        <span className="w-10 shrink-0 font-mono text-sm">{item.value}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                            <span
                                className="block h-full rounded-full bg-brand"
                                style={{width: `${total ? (item.count / total) * 100 : 0}%`}}
                            />
                        </span>
                        <span className="w-8 shrink-0 text-right text-sm text-muted">{item.count}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
