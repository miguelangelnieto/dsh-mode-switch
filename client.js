/**
 * Browser half of the Mode switch plugin: the composer's missing "Plan"
 * control for the current Session.
 *
 * DeepSeek Harness already ships plan mode and a Plan chip that turns it off,
 * but that chip only appears while plan mode is on, so entering plan mode
 * normally means remembering `/plan`. This plugin fills the other half: while
 * the effective mode is execution it renders a neutral Plan pill in the
 * composer's mode cluster. Clicking it enters plan mode through the existing
 * `/plan` human command; the shipped chip then replaces the pill as the way
 * back.
 *
 * The pill is deliberately built to read as the chip's off state: the same
 * localized label in every shipped locale, the same plan artwork, the same
 * 28px pill geometry and position, and the same "state + action + command"
 * copy frame. Hovering or focusing it swaps the plan glyph for a circled plus,
 * mirroring the chip's hover circle-x.
 *
 * Visibility follows the effective (folded) mode: the pill renders whenever
 * the chip's `pending ? !active : active` target is execution. During a queued
 * exit the pill stays visible but disabled and busy, so the mode cluster never
 * goes blank while a selection waits for the next accepted step.
 *
 * Plain JavaScript: the page provides React through the client module table,
 * and the module registers a lazy factory instead of relying on a bundler.
 * Styles reference only `--dsw-*` theme tokens, are scoped by this plugin's
 * `dsh-plan-entry` prefix, and unmount with the component.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-mode-switch',
  factory(require) {
    const React = require('react')
    const { Fragment, useEffect, useRef, useState } = React
    const h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    const NS = 'mode-switch'
    /** Session Projection key owned by the plan-mode package. */
    const PLAN_PROJECTION = 'plan'

    // The label is the shipped plan chip's own `chip.label` in every shipped
    // locale, so the handoff never changes the word on screen. The remaining
    // copy mirrors the chip's `chip.on.aria` / `chip.on.title` frame.
    const en = {
      label: 'Plan',
      enter: 'Plan mode off, press to turn on',
      hint: 'Plan mode off — click to turn on (/plan)',
      leaving: 'Plan mode on — leaving after this step',
      error: 'Could not enter plan mode.',
    }

    const es = {
      label: 'Planificar',
      enter: 'Modo plan desactivado, presione para activar',
      hint: 'Modo de planificación desactivado: haga clic para activar (/plan)',
      leaving: 'Modo de planificación activado: se desactivará después de este paso',
      error: 'No se pudo entrar en el modo de planificación.',
    }

    const zh = {
      label: '计划',
      enter: '计划模式已关闭，按下开启',
      hint: '计划模式已关闭 — 点击开启（/plan）',
      leaving: '计划模式已开启 — 本步之后关闭',
      error: '无法进入计划模式。',
    }

    const ja = {
      label: '計画',
      enter: '計画モードはオフです。押すとオンになります',
      hint: '計画モードはオフです — クリックでオン (/plan)',
      leaving: '計画モードはオンです — このステップの後にオフになります',
      error: '計画モードにできませんでした。',
    }

    const fr = {
      label: 'Planifier',
      enter: 'Mode Plan désactivé, appuyez pour activer',
      hint: 'Mode Plan désactivé — cliquez pour activer (/plan)',
      leaving: 'Mode Plan activé — désactivation après cette étape',
      error: 'Impossible d’activer le mode Plan.',
    }

    const de = {
      label: 'Planen',
      enter: 'Planmodus aus, zum Einschalten drücken',
      hint: 'Planmodus aus – zum Einschalten klicken (/plan)',
      leaving: 'Planmodus ein – Ausschalten nach diesem Schritt',
      error: 'Planmodus konnte nicht aktiviert werden.',
    }

    const ru = {
      label: 'План',
      enter: 'Режим планирования выключен. Нажмите, чтобы включить.',
      hint: 'Режим планирования выключен — нажмите, чтобы включить (/plan)',
      leaving: 'Режим планирования включен — выключится после этого шага',
      error: 'Не удалось включить режим планирования.',
    }

    const pt = {
      label: 'Plano',
      enter: 'Modo de planejamento desativado, pressione para ativar',
      hint: 'Modo de planejamento desativado – clique para ativar (/plan)',
      leaving: 'Modo de planejamento ativado – desativação após esta etapa',
      error: 'Não foi possível ativar o modo de planejamento.',
    }

    const CSS = `
.dsh-plan-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.dsh-plan-entry-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  min-width: 34px;
  padding: 0 8px;
  border: none;
  border-radius: var(--dsw-radius-sm);
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
@media (hover: hover) {
  .dsh-plan-entry-trigger:hover:not([aria-disabled="true"]) {
    background: var(--dsw-alias-interactive-bg-hover);
    color: var(--dsw-alias-label-primary);
  }
}
.dsh-plan-entry-trigger:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
.dsh-plan-entry-trigger[aria-disabled="true"] {
  opacity: 0.6;
  cursor: default;
}
.dsh-plan-entry-glyph {
  display: inline-flex;
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
}
.dsh-plan-entry-glyph svg {
  display: block;
}
/* The chip swaps its plan glyph for a circled x on hover/focus; the entry
   pill mirrors that mechanism with a circled plus in the same 14px slot. */
.dsh-plan-entry-action {
  display: none;
}
@media (hover: hover) {
  .dsh-plan-entry-trigger:hover:not([aria-disabled="true"]) .dsh-plan-entry-rest {
    display: none;
  }
  .dsh-plan-entry-trigger:hover:not([aria-disabled="true"]) .dsh-plan-entry-action {
    display: inline-flex;
  }
}
.dsh-plan-entry-trigger:focus-visible:not([aria-disabled="true"]) .dsh-plan-entry-rest {
  display: none;
}
.dsh-plan-entry-trigger:focus-visible:not([aria-disabled="true"]) .dsh-plan-entry-action {
  display: inline-flex;
}
.dsh-plan-entry-error {
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
}
`

    /**
     * The shipped plan chip's own `plan-outline` artwork (static path data,
     * viewBox 16, regular 1px strokes) so the handoff does not change the
     * glyph's silhouette or weight.
     */
    function PlanGlyph() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 14, height: 14,
        fill: 'none', strokeWidth: 1, 'aria-hidden': 'true',
      }, [
        h('path', { key: 'rule-1', d: 'M4.9375 5.90295H11.0625', stroke: 'currentColor' }),
        h('path', { key: 'rule-2', d: 'M4.9375 9.02991H8.27841', stroke: 'currentColor' }),
        h('path', {
          key: 'page',
          d: 'M12.5 1.32617C13.3039 1.32617 14 1.95171 14 2.77637V7.61328L13 8.68164V2.77637C13 2.55186 12.8007 2.32617 12.5 2.32617H3.5C3.1993 2.32617 3 2.55186 3 2.77637V13.2246C3.00044 13.4489 3.19963 13.6738 3.5 13.6738H8.32812L7.39258 14.6738H3.5C2.69637 14.6738 2.00042 14.0489 2 13.2246V2.77637C2 1.95171 2.69613 1.32617 3.5 1.32617H12.5Z',
          fill: 'currentColor',
        }),
        h('path', {
          key: 'pencil-tip',
          d: 'M8.97212 14.3693C9.17511 14.5723 9.37811 14.7753 9.5811 14.9783C9.67012 14.8953 9.75914 14.8123 9.84815 14.7293C11.4505 13.2352 13.0528 11.7411 14.6551 10.247C14.7441 10.164 14.8331 10.081 14.9221 9.99803C14.5989 9.6748 14.2756 9.35157 13.9524 9.02834C13.8694 9.11736 13.7864 9.20637 13.7034 9.29539C12.2093 10.8977 10.7152 12.5 9.22113 14.1023C9.13813 14.1913 9.05513 14.2803 8.97212 14.3693Z',
          fill: 'currentColor',
        }),
        h('path', {
          key: 'pencil-line',
          d: 'M11.6323 13.7841C11.6323 14.0395 11.6323 14.295 11.6323 14.5504C11.6812 14.5523 11.7301 14.5543 11.779 14.5562C12.659 14.5913 13.539 14.6263 14.419 14.6614C14.4679 14.6633 14.5168 14.6653 14.5657 14.6672C14.5657 14.3339 14.5657 14.0006 14.5657 13.6672C14.5168 13.6692 14.4679 13.6711 14.419 13.6731C13.539 13.7081 12.659 13.7432 11.779 13.7783C11.7301 13.7802 11.6812 13.7821 11.6323 13.7841Z',
          fill: 'currentColor',
        }),
      ])
    }

    /** Circled plus shown on hover/focus, mirroring the chip's circled x. */
    function EnterGlyph() {
      return h('svg', {
        viewBox: '0 0 16 16', width: 14, height: 14,
        fill: 'none', 'aria-hidden': 'true',
      }, h('path', {
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        d: 'M15 8A7 7 0 1 1 1 8A7 7 0 1 1 15 8ZM7.25 4.75V7.25H4.75V8.75H7.25V11.25H8.75V8.75H11.25V7.25H8.75V4.75H7.25Z',
        fill: 'currentColor',
      }))
    }

    /**
     * The composer's plan-mode entry control.
     * @param props seat runtime props (`useProjection`, `useSession`,
     *   `sessionId`, `t`) plus the injected `enterPlanMode` writer.
     */
    function PlanPill({ useProjection, useSession, sessionId, enterPlanMode, t: translate }) {
      const t = typeof translate === 'function' ? translate : key => key
      const plan = useProjection(PLAN_PROJECTION)
      const removed = useSession(s => s.removed) ?? false
      const [busy, setBusy] = useState(false)
      const [failure, setFailure] = useState(null)
      const inFlight = useRef(false)
      const liveSession = useRef(sessionId)

      // A different Session owns different mode state, and a late command
      // result must not paint a failure onto the new Session.
      useEffect(() => {
        liveSession.current = sessionId
        inFlight.current = false
        setBusy(false)
        setFailure(null)
      }, [sessionId])

      // The effective (folded) mode: a pending selection shows its target.
      const target = plan === null || plan === undefined
        ? undefined
        : plan.pending ? !plan.active : plan.active
      // Execution is the pill's half; the shipped chip owns plan mode. A
      // removed Session renders its own composer state instead.
      if (target !== false || removed) return null

      // A queued exit is still plan mode; show it busy until the step applies.
      const leaving = plan.pending
      const disabled = busy || leaving

      const enter = () => {
        if (inFlight.current || disabled) return
        const origin = sessionId
        inFlight.current = true
        setBusy(true)
        setFailure(null)
        Promise.resolve()
          .then(() => enterPlanMode())
          .then(outcome => {
            inFlight.current = false
            if (liveSession.current !== origin) return
            setBusy(false)
            if (outcome !== undefined && outcome.ok === true) return
            setFailure(outcome !== undefined && typeof outcome.message === 'string'
              ? outcome.message
              : t('error'))
          }, reason => {
            inFlight.current = false
            if (liveSession.current !== origin) return
            setBusy(false)
            setFailure(reason instanceof Error ? reason.message : String(reason))
          })
      }

      return h(Fragment, null,
        h('style', { key: 'style' }, CSS),
        h('span', { key: 'root', className: 'dsh-plan-entry' }, [
          h('button', {
            key: 'trigger',
            type: 'button',
            className: 'dsh-plan-entry-trigger',
            // A queued change is a status, not a second action.
            'aria-label': leaving ? t('leaving') : t('enter'),
            'aria-busy': disabled ? 'true' : undefined,
            // `aria-disabled` instead of `disabled` keeps keyboard focus in
            // place while the command is in flight; enter() ignores the click.
            'aria-disabled': disabled ? 'true' : undefined,
            title: leaving ? t('leaving') : t('hint'),
            // Keep the caret in the composer: entering plan mode must not end the draft.
            onMouseDown: event => { event.preventDefault() },
            onClick: leaving ? undefined : enter,
          }, [
            h('span', { key: 'rest', className: 'dsh-plan-entry-glyph dsh-plan-entry-rest' }, h(PlanGlyph)),
            h('span', { key: 'action', className: 'dsh-plan-entry-glyph dsh-plan-entry-action' }, h(EnterGlyph)),
            h('span', { key: 'label' }, t('label')),
          ]),
          failure === null
            ? null
            : h('span', {
              key: 'error',
              className: 'dsh-plan-entry-error',
              role: 'status',
              title: failure,
            }, t('error')),
        ]),
      )
    }

    return {
      // `remote.commands` is the generated namespace that owns the /plan
      // invocation; declaring it keeps activation behind the Remote assembly.
      inject: ['slots', 'locale', 'remote', 'remote.commands'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { en, es, zh, ja, fr, de, ru, pt }), 'mode-switch: dictionaries')

        /** Read the Remote-envelope outcome and translate it into a switch result. */
        const dispatch = async (sessionId, line) => {
          const commands = ctx.remote === undefined ? undefined : ctx.remote.commands
          if (commands === undefined || typeof commands.execute !== 'function') {
            return { ok: false, message: 'the /plan command is unavailable in this client' }
          }
          let result
          try {
            result = await commands.execute(sessionId, line, [])
          } catch (reason) {
            return { ok: false, message: reason instanceof Error ? reason.message : String(reason) }
          }
          if (result === undefined || result.ok !== true) {
            const error = result === undefined ? undefined : result.error
            return {
              ok: false,
              message: error === undefined
                ? `could not execute ${line}`
                : `${String(error.message)} (${String(error.code)})`,
            }
          }
          const execution = result.value
          if (execution === undefined) return { ok: false, message: `unknown command: ${line}` }
          const outcome = execution.result
          if (outcome !== undefined && outcome.kind === 'error') {
            return { ok: false, message: String(outcome.text) }
          }
          return { ok: true }
        }

        ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
          name: 'conversation.input.left',
          id: 'mode-switch',
          // First in the additive seat, so no other entry can sit between the
          // permission cluster, the shipped chip, and this pill.
          order: -100,
          locale: NS,
          inject: sessionId => ({
            // Entering rides the plan-mode package's own human command, so
            // the mode change stays a logged command.
            enterPlanMode: () => dispatch(sessionId, '/plan'),
          }),
        }, PlanPill))
      },
    }
  },
})
