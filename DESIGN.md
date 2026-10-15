# Midnight Sapphire & Champagne Gold — Merged Color Scheme

Hybrid. Hero, cards, tables, status, sidebar, tokens = Midnight Sapphire & Champagne Gold. Bottom of portfolio (CTA band, client section, footer) = Midnight Navy & Champagne Gloss. Light + dark.

## Rules
- Gold = sheen + trim (hairlines, icons, CTA, dark-mode primary). Never big fills, never behind data.
- Gold text on light → `gold-text` only. Gold-500 text only on midnight/navy.
- Gloss (gradients, top highlight, shine) = portfolio + primary CTAs. Dashboard = flat.
- Glass blur = public nav only (+ ghost button over hero/CTA band).
- Max 1 gold CTA per view.
- Status never color alone → icon + label.
- One light source, top-left.

## 1. Primitives

### Source: Sapphire (hero, card, table, app)
| Name | Hex |
|---|---|
| midnight-950 | #060B16 |
| midnight-900 | #0A1324 |
| midnight-800 (brand) | #101C33 |
| midnight-700 | #16294A |
| sapphire-600 | #1F3B6B |
| sapphire-500 | #2C5190 |
| sapphire-400 | #4A74B8 |
| sapphire-300 | #8FB0E8 |
| sapphire-100 | #DCE6F7 |
| sapphire-50 | #EEF2F8 |
| gold-700 | #7D5A22 |
| gold-600 | #A07A38 |
| gold-500 (brand) | #C09A4E |
| gold-400 | #D8B870 |
| gold-300 | #E8D09A |
| gold-200 | #EBD6A4 |
| gold-100 | #F6EDD6 |
| pearl-50 | #FCFBF8 |
| pearl-100 (brand) | #F8F6F1 |
| pearl-200 | #F0ECE3 |
| slate-900 | #141B2B |
| slate-700 | #3A4557 |
| slate-600 | #566176 |
| slate-400 | #98A2B3 |
| slate-300 | #C5CCD9 |
| slate-200 | #E1E6EE |
| slate-100 | #EDF0F5 |
| slate-50 | #F4F6FA |
| white | #FFFFFF |

### Source: Navy (bottom sections only)
| Name | Hex |
|---|---|
| navy-950 | #040A18 |
| navy-900 | #070F24 |
| navy-800 | #0E1F47 |
| navy-600 | #1C3F85 |
| gold-gloss-300 | #F6E3AE |
| gold-gloss-400 | #E6C477 |
| gold-gloss-500 | #C29A44 |
| hero-muted-light | #BAC6E0 |
| hero-muted-dark | #9FAAC4 |

## 2. Semantic tokens (shadcn/ui) — from Sapphire

| Token | Light | Dark |
|---|---|---|
| background | #F4F6FA | #060C18 |
| foreground | #141B2B | #EAEEF5 |
| card | #FFFFFF | #0E1829 |
| card-foreground | #141B2B | #EAEEF5 |
| popover | #FFFFFF | #0E1829 |
| popover-foreground | #141B2B | #EAEEF5 |
| primary | #101C33 | #E8D09A |
| primary-foreground | #FFFFFF | #0A1324 |
| secondary | #EEF2F8 | #16233A |
| secondary-foreground | #101C33 | #EAEEF5 |
| muted | #EDF0F5 | #16233A |
| muted-foreground | #566176 | #9FAAC0 |
| accent | #F6EDD6 | #2B2618 |
| accent-foreground | #0A1324 | #F6EDD6 |
| destructive | #B42318 | #F0877E |
| destructive-foreground | #FFFFFF | #0A1324 |
| border | #E1E6EE | #1E2D47 |
| border-strong | #C5CCD9 | #2F4263 |
| input | #C5CCD9 | #3D5176 |
| ring | #2C5190 | #D8B870 |
| link | #1F3B6B | #8FB0E8 |
| link-hover | #7D5A22 | #E8D09A |
| gold (decor) | #C09A4E | #D8B870 |
| gold-text | #7D5A22 | #E8D09A |
| selection | #E8D09A | #5A4727 |
| disabled | #EDF0F5 | #16233A |
| disabled-foreground | #98A2B3 | #66738A |
| overlay | rgba(6,11,22,.60) | rgba(2,6,14,.75) |

### Surfaces
| Token | Light | Dark |
|---|---|---|
| surface-0 (app bg) | #F4F6FA | #060C18 |
| surface-1 (card) | #FFFFFF | #0E1829 |
| surface-2 (raised) | #FFFFFF | #14213A |
| surface-3 (paper) | #F8F6F1 | #1A2A47 |

### Feedback
| Token | Light fg / bg | Dark fg / bg |
|---|---|---|
| success | #17623A / #E2F3E8 | #6FCF97 / #12301F |
| warning | #6B4A0A / #FBF1D9 | #F2C46D / #3A2D0C |
| danger | #991B1B / #FBE0E0 | #F0877E / #3D1717 |
| info | #1B4B82 / #E6EEF8 | #8DB6EC / #13284A |

### Case status (label configurable, icon required)
| Status | Light fg / bg | Dark fg / bg |
|---|---|---|
| new | #1B4B82 / #E6EEF8 | #8DB6EC / #13284A |
| pending | #6B4A0A / #FBF1D9 | #F2C46D / #3A2D0C |
| in-progress | #0F5560 / #E3F0F4 | #7FD0DC / #0F3038 |
| waiting-info | #5B2D82 / #F1E8F7 | #C9A5E6 / #2B1B3A |
| completed | #17623A / #E2F3E8 | #6FCF97 / #12301F |
| on-hold | #3F4756 / #EEF0F3 | #B6BFCC / #232C3B |
| cancelled | #5E4A44 / #F1ECEA | #CDB9B3 / #2E2523 |
| upcoming-hearing | #16294A / #DCE6F7 | #C3D5F2 / #1B3258 |
| urgent | #9A3412 / #FCE8E1 | #F5A97A / #3D2113 |
| overdue | #991B1B / #FBE0E0 | #F0877E / #3D1717 |

Icons: new ● · pending clock · in-progress spinner · waiting hourglass · completed check · on-hold pause · cancelled x · hearing gavel · urgent triangle · overdue alarm.

### Chart
| Token | Light | Dark |
|---|---|---|
| chart-1 | #2C5190 | #8FB0E8 |
| chart-2 | #A07A38 | #E8D09A |
| chart-3 | #0F5560 | #7FD0DC |
| chart-4 | #5B2D82 | #C9A5E6 |
| chart-5 | #566176 | #9FAAC0 |

### Sidebar
| Token | Light | Dark |
|---|---|---|
| sidebar | #0A1324 | #050A14 |
| sidebar-foreground | #CFD8E8 | #BCC8DC |
| sidebar-primary | #C09A4E | #E8D09A |
| sidebar-primary-foreground | #060B16 | #060B16 |
| sidebar-accent | #121F38 | #0F1A30 |
| sidebar-accent-foreground | #FFFFFF | #FFFFFF |
| sidebar-border | #1C2C48 | #162540 |
| sidebar-ring | #E8D09A | #E8D09A |

## 3. Gloss + elevation (Sapphire base)

| Token | Light | Dark |
|---|---|---|
| gloss-primary | linear-gradient(180deg,#2A4A86 0%,#16294A 48%,#0F1C36 100%) | linear-gradient(180deg,#EBD6A4 0%,#D8B870 45%,#B08A3E 100%) |
| gloss-gold | linear-gradient(180deg,#EBD6A4 0%,#D8B870 40%,#B08A3E 100%) | same |
| gloss-highlight (inset top edge) | rgba(255,255,255,.22) | rgba(255,255,255,.35) on gold, .08 on dark surfaces |
| gloss-shine (hover sweep) | linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent) | same |
| card-sheen (inset top 1px) | rgba(255,255,255,.95) | rgba(255,255,255,.07) |
| gold-hairline | linear-gradient(90deg,transparent,#D8B870,transparent) | same |
| nav-glass | rgba(248,246,241,.78) + blur 14px | rgba(6,12,24,.72) + blur 14px |
| gold-glow (CTA shadow) | rgba(216,184,112,.55) | same |
| shadow-color | rgba(16,28,51,.13) | rgba(0,0,0,.55) |

## 4. Experience tokens

### Portfolio top (public) — Sapphire
| Token | Light | Dark |
|---|---|---|
| portfolio-bg | #F8F6F1 | #060C18 |
| portfolio-section-alt | #F0ECE3 | #0A1424 |
| portfolio-hero-bg | radial-gradient(60% 90% at 88% 0%,rgba(192,154,78,.26),transparent 62%), radial-gradient(50% 70% at 0% 100%,rgba(74,116,184,.22),transparent 60%), linear-gradient(155deg,#16294A 0%,#0A1324 55%,#060B16 100%) | same layers, gold .20 / sapphire .20, base linear-gradient(155deg,#0F1B33 0%,#060C18 55%,#03070F 100%) |
| portfolio-hero-fg | #FFFFFF | #F4F1EA |
| portfolio-accent (on midnight) | #D8B870 | #E8D09A |
| portfolio-image-overlay | linear-gradient(180deg,rgba(6,11,22,.10),rgba(6,11,22,.78)) | same |

### Portfolio bottom (client section, CTA band, footer) — Navy
| Token | Light | Dark |
|---|---|---|
| bottom-hero (CTA band / client section bg) | linear-gradient(160deg,#060D20,#0E1F47 55%,#1C3F85) | linear-gradient(160deg,#030816,#070F24 60%,#0E1F47) |
| bottom-hero-glow | radial-gradient(52rem 26rem at 88% -8%,rgba(230,196,119,.2),transparent 62%) | same |
| bottom-fg | #FBF9F4 | #F4F0E6 |
| bottom-muted | #BAC6E0 | #9FAAC4 |
| bottom-gold-gloss (CTA) | linear-gradient(180deg,#F6E3AE,#E0BC6A 45%,#B98E3A) | linear-gradient(180deg,#F8E7B8,#E6C477 45%,#C29A44) |
| bottom-sheen | linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,0) 60%) | linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,0) 60%) |
| bottom-divider-gold | linear-gradient(90deg,transparent,#C29A44,transparent) | linear-gradient(90deg,transparent,#E6C477,transparent) |
| bottom-glass | rgba(255,255,255,.06) + blur(6px) | same |
| footer-bg | #070F24 | #040A18 |
| glow-gold (CTA hover/focus) | 0 8px 20px -6px rgba(194,154,68,.55) | 0 8px 24px -6px rgba(230,196,119,.45) |
| glow-card-hover | 0 22px 44px -14px rgba(194,154,68,.4) | 0 22px 44px -14px rgba(230,196,119,.3) |

### Dashboard (private) — Sapphire
| Token | Light | Dark |
|---|---|---|
| dashboard-bg | #F4F6FA | #060C18 |
| dashboard-sidebar-bg | #0A1324 | #050A14 |
| dashboard-nav-active-bg | #121F38 | #0F1A30 |
| dashboard-nav-active-marker | #C09A4E | #E8D09A |
| dashboard-table-header-bg | #EDF0F5 | #14213A |
| dashboard-row-hover | #F6F8FB | #111D32 |
| dashboard-row-selected | #EAF0FB | #182C50 |
| dashboard-elevated | #FFFFFF | #14213A |

## 5. Contrast notes
- gold-500 #C09A4E on pearl ≈ 2.5:1 → never text on light. Use gold-text #7D5A22 (≈5.8:1).
- gold-400/300 on midnight ≥ 8:1 → safe text on dark.
- muted-foreground #566176 on white ≈ 6:1.
- white on midnight-800 ≈ 16:1. midnight-950 on gold gradient ≥ 8:1.
- bottom-muted #BAC6E0 on footer-bg #070F24 → high contrast, safe body text.
- Ratios hand-calculated. Re-check every pair after edits.

## 6. Component design
Radius modest: controls 6px, cards 8–12px.

**Button**
- Primary public: gloss-primary + gloss-highlight + soft shadow + shine sweep on hover. Primary dashboard: flat primary.
- Hero CTA: gloss-gold, midnight-950 text, gold-gloss shadow.
- Bottom CTA (CTA band): bottom-gold-gloss, accent-foreground text #1A1405, inset highlight, glow-gold on hover/focus. Only gold CTA in view.
- Ghost over hero / CTA band: bottom-glass, bottom-fg text.
- Secondary: secondary bg/fg. Outline: border-strong, transparent; hover accent.
- Destructive: destructive bg, destructive-foreground.
- Disabled: disabled bg, disabled-foreground, no shadow/sheen.
- Focus: 2px ring, 2px offset, all variants.

**Input / Select / Textarea**
- bg card, border input, placeholder muted-foreground. Hover border-strong. Focus ring + 2px outline.
- Error: border destructive + danger helper text. Always message text.
- Disabled: muted bg.

**Card**
- Dashboard: card bg, 1px border, card-sheen top edge, shadow-sm. No gradient.
- Portfolio service card: card bg, card-sheen, soft shadow; hover lifts 2px, shadow grows, gold-hairline on top.

**Table (dashboard)**
- Header dashboard-table-header-bg, small uppercase muted. Row hover dashboard-row-hover; selected dashboard-row-selected + 2px gold marker left.
- Numbers tabular. Overdue date text → danger + icon.

**Badge**
- Case status: status bg/fg, no border, icon + label. Generic: secondary/accent.

**Navigation**
- Public: nav-glass, border bottom, active = gold underline. Transparent over hero allowed (white text).
- Sidebar: sidebar bg, hover sidebar-accent, active sidebar-accent + gold marker bar.
- Tabs: underline, active primary text + 2px underline.

**Dialog / Popover / Sheet**
- popover bg, 1px border, overlay behind. Destructive confirm → destructive button + outline cancel.

**Alerts / toasts**
- Feedback bg + fg, 3px left border, icon required.

**Links**
- link color, underline in prose, hover link-hover.

**Hero (portfolio)**
- portfolio-hero-bg (gold glow top-right, sapphire glow bottom-left), white text, gold eyebrow, gold-hairline divider.

**Client section (portfolio bottom)**
- bg bottom-hero + bottom-hero-glow, text bottom-fg / bottom-muted. Client cards: glass or navy-800 surface, 1px edge, bottom-sheen. Gold only as hairline, icon, one CTA.

**CTA band**
- bg bottom-hero, headline bottom-fg, one bottom-gold-gloss CTA, optional ghost button.

**Footer (portfolio)**
- bg footer-bg, text bottom-muted, bottom-divider-gold hairline on top, small legal notice.

**Dark mode**
- True semantic override. Primary flips to gold gloss on midnight text. Portfolio hero already dark in light mode. Bottom sections use dark column of bottom tokens.
