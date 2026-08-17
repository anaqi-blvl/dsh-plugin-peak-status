/**
 * dsh-peak-status — browser half.
 *
 * Registers a mini DeepSeek peak/off-peak status widget into the sidebar's
 * footer action slot (above the settings button). The widget shows a colored
 * dot + status word + compact countdown when the sidebar is expanded (just
 * the dot when collapsed to the rail). Clicking it opens a modal with the
 * full picture: current status, countdown to the next window change, a 24h
 * window timeline in local time, and the off-peak/peak rate table.
 *
 * Rate schedule (UTC, from the official DeepSeek pricing page, Aug 2026):
 *   peak = 01:00–04:00 and 06:00–10:00 UTC; everything else is off-peak.
 *   Off-peak rates are 50% of peak.
 *
 *   V4 Flash  off-peak in $0.22 / out $0.66 · peak in $0.44 / out $1.32
 *   V4 Pro    off-peak in $0.66 / out $1.98 · peak in $1.32 / out $3.96
 *   Per 1M tokens. Input is cache miss; cache hits cost much less.
 */
window.__ModuleLoader__.load({
	id: "dsh-peak-status",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		const { useState, useEffect, useMemo } = react;

		const css = `/* dsh-peak-status — DeepSeek peak/off-peak widget + modal. */
.dsh-peak-widget{
	box-sizing:border-box;
	border:none;
	background:transparent;
	color:var(--dsw-alias-label-primary);
	cursor:pointer;
	border-radius:10px;
	width:100%;
	min-width:0;
	height:34px;
	align-items:center;
	gap:7px;
	padding:0 10px;
	font-size:12px;
	line-height:16px;
	display:flex;
	text-align:left;
}
.dsh-peak-widget:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-peak-widget:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:-1px}
.dsh-peak-widget[data-wide=false]{
	width:36px;
	height:36px;
	justify-content:center;
	padding:0;
	border-radius:50%;
}
.dsh-peak-dot{
	flex:none;
	width:8px;
	height:8px;
	border-radius:50%;
	background:var(--dsw-alias-state-success-primary);
	box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent);
}
.dsh-peak-widget[data-peak=true] .dsh-peak-dot{
	background:var(--dsw-alias-state-warn-primary);
	box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-warn-primary) 18%, transparent);
}
.dsh-peak-widget[data-peak=false] .dsh-peak-dot{
	animation:dsh-peak-pulse 2.4s var(--ds-ease-in-out) infinite;
}
@keyframes dsh-peak-pulse{0%,100%{box-shadow:0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent)}50%{box-shadow:0 0 0 5px color-mix(in srgb, var(--dsw-alias-state-success-primary) 6%, transparent)}}
.dsh-peak-label{
	flex:none;
	white-space:nowrap;
	overflow:hidden;
	text-overflow:ellipsis;
	max-width:88px;
	color:var(--dsw-alias-label-primary);
}
.dsh-peak-widget[data-peak=true] .dsh-peak-label{color:var(--dsw-alias-state-warn-label)}
.dsh-peak-widget[data-peak=false] .dsh-peak-label{color:var(--dsw-alias-state-success-primary)}
.dsh-peak-count{
	flex:1;
	min-width:0;
	white-space:nowrap;
	overflow:hidden;
	text-overflow:ellipsis;
	font-variant-numeric:tabular-nums;
	color:var(--dsw-alias-label-tertiary);
	text-align:right;
}
.dsh-peak-widget[data-wide=false] .dsh-peak-label,.dsh-peak-widget[data-wide=false] .dsh-peak-count{display:none}

/* modal */
.dsh-peak-modal{
	width:min(92vw, 460px) !important;
	color:var(--dsw-alias-label-primary);
}
.dsh-peak-modal .dsh-peak-head{
	flex-direction:column;
	gap:10px;
	padding:18px 20px 14px;
	display:flex;
}
.dsh-peak-hero{
	align-items:center;
	gap:10px;
	display:flex;
}
.dsh-peak-hero .dsh-peak-dot{width:12px;height:12px}
.dsh-peak-hero-title{
	font-size:16px;
	font-weight:600;
	line-height:22px;
	color:var(--dsw-alias-label-primary);
}
.dsh-peak-hero-sub{
	font-size:12px;
	line-height:18px;
	color:var(--dsw-alias-label-secondary);
}
.dsh-peak-count-big{
	font-variant-numeric:tabular-nums;
	font-size:24px;
	font-weight:600;
	line-height:30px;
	letter-spacing:.01em;
	margin-left:auto;
	color:var(--dsw-alias-label-primary);
}
.dsh-peak-section{
	border-top:1px solid var(--dsw-alias-border-l2);
	padding:14px 20px 16px;
}
.dsh-peak-section-title{
	font-size:12px;
	font-weight:600;
	line-height:16px;
	user-select:none;
	color:var(--dsw-alias-label-secondary);
	margin:0 0 10px;
}
.dsh-peak-timeline{
	flex-direction:column;
	gap:8px;
	display:flex;
}
.dsh-peak-timeline-row{
	align-items:center;
	gap:8px;
	display:flex;
}
.dsh-peak-timeline-axis{
	flex:1;
	min-width:0;
	height:22px;
	border-radius:6px;
	background:var(--dsw-alias-bg-module-platform);
	flex-direction:row;
	display:flex;
	overflow:hidden;
	position:relative;
}
.dsh-peak-tl-seg{
	flex:1;
	min-width:0;
	height:100%;
}
.dsh-peak-tl-seg[data-peak=true]{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 62%, transparent)}
.dsh-peak-tl-seg[data-peak=false]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 24%, transparent)}
.dsh-peak-tl-seg[data-phantom]{
	background:repeating-linear-gradient(135deg, transparent 0 3px, color-mix(in srgb, var(--dsw-alias-label-tertiary) 30%, transparent) 3px 6px) !important;
	opacity:.55;
}
.dsh-peak-tl-half{flex:1;min-width:0;height:100%}
.dsh-peak-tl-half[data-peak=true]{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 62%, transparent)}
.dsh-peak-tl-half[data-peak=false]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 24%, transparent)}
.dsh-peak-tl-seg[data-repeated]{display:flex;flex-direction:row}
.dsh-peak-tl-seg[data-now=true]{
	box-shadow:inset 0 0 0 1.5px var(--dsw-alias-state-business-primary);
	position:relative;
}
.dsh-peak-tl-seg[data-now=true]:after{
	content:"";
	background:var(--dsw-alias-state-business-primary);
	border-radius:50%;
	width:5px;
	height:5px;
	position:absolute;
	top:50%;
	left:50%;
	transform:translate(-50%,-50%);
}
.dsh-peak-tl-ticks{
	flex:1;
	min-width:0;
	justify-content:space-between;
	font-size:10px;
	line-height:12px;
	font-variant-numeric:tabular-nums;
	color:var(--dsw-alias-label-tertiary);
	display:flex;
}
.dsh-peak-tl-tag{
	flex:none;
	width:34px;
	font-size:10px;
	line-height:12px;
	color:var(--dsw-alias-label-tertiary);
	text-align:right;
}
.dsh-peak-legend{
	gap:12px;
	align-items:center;
	font-size:11px;
	line-height:14px;
	color:var(--dsw-alias-label-tertiary);
	display:flex;
}
.dsh-peak-legend-item{flex:none;align-items:center;gap:5px;display:flex}
.dsh-peak-legend-swatch{flex:none;width:8px;height:8px;border-radius:3px}
.dsh-peak-legend-swatch[data-peak=true]{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 62%, transparent)}
.dsh-peak-legend-swatch[data-peak=false]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 24%, transparent)}
.dsh-peak-dst-note{flex:none;color:var(--dsw-alias-state-warn-label)}

.dsh-peak-rates{
	flex-direction:column;
	gap:14px;
	display:flex;
}
.dsh-peak-rate-group{
	flex-direction:column;
	gap:4px;
	display:flex;
}
.dsh-peak-rate-group-title{
	font-size:12px;
	font-weight:600;
	line-height:16px;
	margin:0;
}
.dsh-peak-rate-group-title[data-peak=true]{color:var(--dsw-alias-state-warn-label)}
.dsh-peak-rate-group-title[data-peak=false]{color:var(--dsw-alias-state-success-primary)}
.dsh-peak-rate-row{
	grid-template-columns:1fr 92px 92px;
	align-items:center;
	gap:8px;
	display:grid;
}
.dsh-peak-rate-model{
	font-size:12px;
	line-height:18px;
	color:var(--dsw-alias-label-primary);
}
.dsh-peak-rate-kind{
	font-size:11px;
	line-height:16px;
	color:var(--dsw-alias-label-tertiary);
}
.dsh-peak-rate-amt{
	font-size:12px;
	line-height:18px;
	font-variant-numeric:tabular-nums;
	text-align:right;
	color:var(--dsw-alias-label-primary);
}
.dsh-peak-note{
	font-size:11px;
	line-height:16px;
	color:var(--dsw-alias-label-tertiary);
	margin:0;
}
.dsh-peak-note a{
	color:var(--dsw-alias-state-business-primary);
	text-decoration:none;
}
.dsh-peak-note a:hover{text-decoration:underline}
`;
		const tagId = "dsh-peak-status/peak.css";
		try {
			if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-peak-status";
				tag.dataset.pluginCss = tagId;
				tag.textContent = css;
				document.head.appendChild(tag);
			}
		} catch {
			/* styling must never break the app */
		}

		/** Peak windows in UTC hours (half-open). */
		const PEAK_WINDOWS = [{ start: 1, end: 4 }, { start: 6, end: 10 }];
		const PEAK_BOUNDARIES_UTC = [1, 4, 6, 10]; // transition hours in UTC
		/** Per-1M-token rates (input = cache miss). */
		const RATES = [
			{ model: "DeepSeek V4 Flash", offPeak: { input: "$0.22", output: "$0.66" }, peak: { input: "$0.44", output: "$1.32" } },
			{ model: "DeepSeek V4 Pro", offPeak: { input: "$0.66", output: "$1.98" }, peak: { input: "$1.32", output: "$3.96" } }
		];
		const PRICING_URL = "https://api-docs.deepseek.com/quick_start/pricing";

		/** Whether a UTC minutes-of-day value falls in a peak window. */
		function isPeakUtcMinutes(utcMinutes) {
			return PEAK_WINDOWS.some((w) => utcMinutes >= w.start * 60 && utcMinutes < w.end * 60);
		}
		/** Is the given Date inside a peak window? */
		function isPeak(date) {
			return isPeakUtcMinutes(date.getUTCHours() * 60 + date.getUTCMinutes());
		}
		/** Next window boundary strictly after `date` (in UTC). */
		function nextBoundary(date) {
			const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
			const now = date.getTime();
			for (const h of PEAK_BOUNDARIES_UTC) {
				const t = base + h * 3600e3;
				if (t > now) return new Date(t);
			}
			return new Date(base + 24 * 3600e3 + 3600e3); // tomorrow 01:00 UTC
		}
		/** Compact human countdown: "2h 14m", "38m", "45s". */
		function formatCompact(ms) {
			const total = Math.max(0, Math.floor(ms / 1e3));
			const h = Math.floor(total / 3600);
			const m = Math.floor((total % 3600) / 60);
			const s = total % 60;
			if (h > 0) return `${h}h ${m}m`;
			if (m > 0) return `${m}m`;
			return `${s}s`;
		}
		/** Full countdown: "02:14:33". */
		function formatFull(ms) {
			const total = Math.max(0, Math.floor(ms / 1e3));
			const pad = (n) => String(n).padStart(2, "0");
			return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
		}
		/** Local 12h label for a Date: "3:00 AM". */
		function formatLocalTime(date) {
			return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
		}
		/** Build one tick of the shared clock. */
		function computeTick(now) {
			const peak = isPeak(now);
			const boundary = nextBoundary(now);
			const remaining = boundary.getTime() - now.getTime();
			return {
				peak,
				remaining,
				compact: formatCompact(remaining),
				full: formatFull(remaining),
				boundary
			};
		}
		/** Re-render on an interval. */
		function useNow(intervalMs = 1e3) {
			const [now, setNow] = useState(() => new Date());
			useEffect(() => {
				const id = window.setInterval(() => setNow(new Date()), intervalMs);
				return () => window.clearInterval(id);
			}, [intervalMs]);
			return now;
		}
		/** 24 local-hour segments for the timeline (DST-safe: probes a real Date per hour).
		* On DST transition days a local hour may not exist (spring-forward: the
		* probe rolls into the following hour, so two consecutive probes land on the
		* same UTC instant) or occur twice (fall-back: probes skip a UTC hour). Those
		* cells are flagged `phantom` / `repeated` instead of being painted a
		* possibly-wrong color. UTC values are minutes since the UTC day that starts
		* on the same date as local midnight, so the midnight wrap stays monotonic. */
		function localHourSegments(now) {
			const probe = new Date(now);
			probe.setHours(0, 0, 0, 0);
			const utcDayStart = Date.UTC(probe.getUTCFullYear(), probe.getUTCMonth(), probe.getUTCDate());
			const utcMinutes = [];
			for (let h = 0; h < 24; h++) {
				const d = new Date(probe);
				d.setHours(h, 30, 0, 0); // mid-hour probe
				utcMinutes.push((d.getTime() - utcDayStart) / 6e4);
			}
			// Probe the next midnight too, so the 23:00 cell can detect a
			// transition that happens exactly at 00:00 local.
			const d24 = new Date(probe);
			d24.setHours(24, 30, 0, 0);
			utcMinutes.push((d24.getTime() - utcDayStart) / 6e4);

			const segs = [];
			const nowLocalHour = now.getHours();
			for (let h = 0; h < 24; h++) {
				const utc = utcMinutes[h];
				const next = utcMinutes[h + 1];
				const seg = {
					peak: isPeakUtcMinutes(utc % 1440),
					now: h === nowLocalHour,
					phantom: false,
					repeated: false,
					peak2: false
				};
				if (next === utc) {
					// Spring-forward: hour h was skipped; its probe rolled forward
					// onto hour h+1's instant.
					seg.phantom = true;
				} else if (next - utc > 60) {
					// Fall-back: hour h occurs twice; the second occurrence is one
					// DST-gap later in UTC. (Handles 30-min gaps too.)
					seg.repeated = true;
					seg.peak2 = isPeakUtcMinutes((utc + (next - utc - 60)) % 1440);
				}
				segs.push(seg);
			}
			return segs;
		}

		/** Mini widget row (sidebar footer, above settings). */
		function PeakStatusWidget({ wide, t }) {
			const now = useNow();
			const tick = useMemo(() => computeTick(now), [now]);
			const [open, setOpen] = useState(false);
			const label = tick.peak ? t("status.peak") : t("status.offpeak");
			return react_jsx_runtime.jsxs(react.Fragment, {
				children: [
					react_jsx_runtime.jsx(primitives.Tooltip, {
						label: `${label} · ${t("widget.countdown", { time: tick.compact })}`,
						delayMs: 600,
						disabled: wide,
						children: react_jsx_runtime.jsx("button", {
							type: "button",
							className: "dsh-peak-widget",
							"data-wide": wide,
							"data-peak": tick.peak,
							"aria-label": `${label} · ${t("widget.countdown", { time: tick.compact })}`,
							onClick: () => setOpen(true),
							children: react_jsx_runtime.jsxs(react.Fragment, {
								children: [
									react_jsx_runtime.jsx("span", { className: "dsh-peak-dot", "aria-hidden": true }),
									react_jsx_runtime.jsx("span", { className: "dsh-peak-label", children: label }),
									react_jsx_runtime.jsx("span", { className: "dsh-peak-count", children: tick.compact })
								]
							})
						})
					}),
					react_jsx_runtime.jsx(PeakStatusModal, {
						open,
						onClose: () => setOpen(false),
						now,
						tick,
						t
					})
				]
			});
		}

		/** Full modal: status hero, countdown, 24h timeline, rate table. */
		function PeakStatusModal({ open, onClose, now, tick, t }) {
			const segments = useMemo(() => localHourSegments(now), [now]);
			const nowLocalHour = now.getHours();
			const hasTransition = segments.some((seg) => seg.phantom || seg.repeated);
			return react_jsx_runtime.jsx(primitives.Modal, {
				open,
				onClose,
				title: t("modal.title"),
				closeLabel: t("modal.close"),
				className: "dsh-peak-modal",
				headless: true,
				children: react_jsx_runtime.jsxs("div", {
					className: "dsh-peak-modal-body",
					children: [
						react_jsx_runtime.jsxs("div", {
							className: "dsh-peak-head",
							children: [
								react_jsx_runtime.jsxs("div", {
									className: "dsh-peak-hero",
									children: [
										react_jsx_runtime.jsx("span", { className: "dsh-peak-dot", "data-peak": tick.peak, "aria-hidden": true }),
										react_jsx_runtime.jsxs("div", {
											children: [
												react_jsx_runtime.jsx("div", {
													className: "dsh-peak-hero-title",
													children: tick.peak ? t("status.peak") : t("status.offpeak")
												}),
												react_jsx_runtime.jsx("div", {
													className: "dsh-peak-hero-sub",
													children: t("modal.nextChange", { time: formatLocalTime(tick.boundary) })
												})
											]
										}),
										react_jsx_runtime.jsx("div", {
											className: "dsh-peak-count-big",
											children: tick.full
										})
									]
								})
							]
						}),
						react_jsx_runtime.jsxs("div", {
							className: "dsh-peak-section",
							children: [
								react_jsx_runtime.jsx("h3", {
									className: "dsh-peak-section-title",
									children: t("modal.windows")
								}),
								react_jsx_runtime.jsxs("div", {
									className: "dsh-peak-timeline",
									children: [
										react_jsx_runtime.jsxs("div", {
											className: "dsh-peak-timeline-row",
											children: [
												react_jsx_runtime.jsx("span", { className: "dsh-peak-tl-tag", children: t("modal.local") }),
												react_jsx_runtime.jsx("div", {
													className: "dsh-peak-timeline-axis",
													"aria-label": t("modal.windows"),
													children: segments.map((seg, i) => {
														const title = seg.phantom
															? `${String(i).padStart(2, "0")}:00 — ${t("modal.hourSkipped")}`
															: seg.repeated
																? `${String(i).padStart(2, "0")}:00 — ${t("modal.hourRepeated")}`
																: `${String(i).padStart(2, "0")}:00`;
														return react_jsx_runtime.jsx("div", {
															className: "dsh-peak-tl-seg",
															"data-peak": seg.peak,
															"data-now": seg.now || void 0,
															"data-phantom": seg.phantom || void 0,
															"data-repeated": seg.repeated || void 0,
															title,
															children: seg.repeated
																? react_jsx_runtime.jsxs(react.Fragment, {
																	children: [
																		react_jsx_runtime.jsx("div", { className: "dsh-peak-tl-half", "data-peak": seg.peak, "aria-hidden": true }),
																		react_jsx_runtime.jsx("div", { className: "dsh-peak-tl-half", "data-peak": seg.peak2, "aria-hidden": true })
																	]
																})
																: void 0
														}, i);
													})
												})
											]
										}),
										react_jsx_runtime.jsx("div", {
											className: "dsh-peak-timeline-row",
											children: [
												react_jsx_runtime.jsx("span", { className: "dsh-peak-tl-tag", children: t("modal.utc") }),
												react_jsx_runtime.jsx("div", {
													className: "dsh-peak-tl-ticks",
													children: ["00", "06", "12", "18", "24"].map((h) => react_jsx_runtime.jsx("span", { children: h }, h))
												})
											]
										}),
										react_jsx_runtime.jsxs("div", {
											className: "dsh-peak-legend",
											children: [
												react_jsx_runtime.jsxs("span", {
													className: "dsh-peak-legend-item",
													children: [
														react_jsx_runtime.jsx("span", { className: "dsh-peak-legend-swatch", "data-peak": false, "aria-hidden": true }),
														t("status.offpeak")
													]
												}),
												react_jsx_runtime.jsxs("span", {
													className: "dsh-peak-legend-item",
													children: [
														react_jsx_runtime.jsx("span", { className: "dsh-peak-legend-swatch", "data-peak": true, "aria-hidden": true }),
														t("status.peak")
													]
												}),
												hasTransition && react_jsx_runtime.jsx("span", {
													className: "dsh-peak-legend-item dsh-peak-dst-note",
													children: t("modal.dstNote")
												})
											]
										})
									]
								})
							]
						}),
						react_jsx_runtime.jsxs("div", {
							className: "dsh-peak-section",
							children: [
								react_jsx_runtime.jsx("h3", {
									className: "dsh-peak-section-title",
									children: t("modal.rates")
								}),
								react_jsx_runtime.jsxs("div", {
									className: "dsh-peak-rates",
									children: [
										react_jsx_runtime.jsxs("div", {
											className: "dsh-peak-rate-group",
											children: [
												react_jsx_runtime.jsx("h4", {
													className: "dsh-peak-rate-group-title",
													"data-peak": false,
													children: t("modal.offpeakRates")
												}),
												RATES.map((row) => react_jsx_runtime.jsxs("div", {
													className: "dsh-peak-rate-row",
													children: [
														react_jsx_runtime.jsx("span", { className: "dsh-peak-rate-model", children: row.model }),
														react_jsx_runtime.jsxs("span", {
															className: "dsh-peak-rate-kind",
															children: [t("modal.input"), " ", react_jsx_runtime.jsx("span", { className: "dsh-peak-rate-amt", children: row.offPeak.input })]
														}),
														react_jsx_runtime.jsxs("span", {
															className: "dsh-peak-rate-kind",
															children: [t("modal.output"), " ", react_jsx_runtime.jsx("span", { className: "dsh-peak-rate-amt", children: row.offPeak.output })]
														})
													]
												}, row.model + "-off"))
											]
										}),
										react_jsx_runtime.jsxs("div", {
											className: "dsh-peak-rate-group",
											children: [
												react_jsx_runtime.jsx("h4", {
													className: "dsh-peak-rate-group-title",
													"data-peak": true,
													children: t("modal.peakRates")
												}),
												RATES.map((row) => react_jsx_runtime.jsxs("div", {
													className: "dsh-peak-rate-row",
													children: [
														react_jsx_runtime.jsx("span", { className: "dsh-peak-rate-model", children: row.model }),
														react_jsx_runtime.jsxs("span", {
															className: "dsh-peak-rate-kind",
															children: [t("modal.input"), " ", react_jsx_runtime.jsx("span", { className: "dsh-peak-rate-amt", children: row.peak.input })]
														}),
														react_jsx_runtime.jsxs("span", {
															className: "dsh-peak-rate-kind",
															children: [t("modal.output"), " ", react_jsx_runtime.jsx("span", { className: "dsh-peak-rate-amt", children: row.peak.output })]
														})
													]
												}, row.model + "-peak"))
											]
										}),
										react_jsx_runtime.jsxs("p", {
											className: "dsh-peak-note",
											children: [
												t("modal.note"),
												" ",
												react_jsx_runtime.jsx("a", {
													href: PRICING_URL,
													target: "_blank",
													rel: "noreferrer",
													children: t("modal.source")
												})
											]
										})
									]
								})
							]
						})
					]
				})
			});
		}

		/** Dictionary namespace owned by this plugin. */
		const NS = "peakStatus";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"status.offpeak": "错峰",
			"status.peak": "高峰",
			"widget.countdown": "距下次调价 {time}",
			"modal.title": "DeepSeek 计价状态",
			"modal.close": "关闭",
			"modal.nextChange": "下次切换：{time}",
			"modal.windows": "计价时段（本地时间）",
			"modal.local": "本地",
			"modal.utc": "UTC",
			"modal.rates": "价格（每 100 万 tokens）",
			"modal.offpeakRates": "错峰价格",
			"modal.peakRates": "高峰价格",
			"modal.input": "输入",
			"modal.output": "输出",
			"modal.perMillion": "per 1M",
			"modal.dstNote": "夏令时切换日",
			"modal.hourSkipped": "该小时不存在（夏令时）",
			"modal.hourRepeated": "该小时出现两次（夏令时）",
			"modal.note": "输入为缓存未命中价；缓存命中大幅更低。价格来自官方页面。",
			"modal.source": "官方定价"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"status.offpeak": "Off-peak",
			"status.peak": "Peak",
			"widget.countdown": "{time} left",
			"modal.title": "DeepSeek Rate Status",
			"modal.close": "Close",
			"modal.nextChange": "Next change: {time}",
			"modal.windows": "Price windows · your time",
			"modal.local": "Local",
			"modal.utc": "UTC",
			"modal.rates": "Rates · per 1M tokens",
			"modal.offpeakRates": "Off-peak rates",
			"modal.peakRates": "Peak rates",
			"modal.input": "input",
			"modal.output": "output",
			"modal.perMillion": "per 1M",
			"modal.dstNote": "DST transition today",
			"modal.hourSkipped": "hour skipped (DST)",
			"modal.hourRepeated": "hour repeats (DST)",
			"modal.note": "Per 1M tokens. Input is cache miss; cache hits cost much less.",
			"modal.source": "official DeepSeek pricing page"
		};

		/** Services required by the plugin. */
		const inject = ["slots", "locale"];

		/** Registers the widget into the sidebar footer slot. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "peak-status: dictionaries");
			ctx.effect(() => ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "peak-status",
				order: 100,
				locale: NS,
				inject: () => ({})
			}, PeakStatusWidget)), "peak-status: footer widget");
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
