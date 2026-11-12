/**
 * Browser half of the Mode switch plugin: the composer's missing "Plan"
 * control for the current Session.
 *
 * DeepSeek Harness already ships plan mode and a Plan chip that turns it off,
 * but that chip only appears while plan mode is on, so entering plan mode
 * normally means remembering `/plan`. This plugin fills the other half: while
 * plan mode is off it renders a neutral Plan button in the composer's mode
 * cluster. Clicking it enters plan mode through the existing `/plan` human
 * command; the shipped chip then replaces the button as the way back.
 *
 * The button renders only in the settled execution state, the exact complement
 * of the shipped chip's `pending ? !active : active` visibility, so the two
 * affordances are never on screen together and both read the same host-folded
 * `plan` Session projection.
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

    const en = {
      label: 'Plan',
      enter: 'Enter plan mode',
      hint: 'Enter plan mode: the agent explores and proposes a plan before making changes.',
      error: 'Could not enter plan mode.',
    }

    const es = {
      label: 'Plan',
      enter: 'Entrar en modo plan',
      hint: 'Entrar en modo plan: el agente explora y propone un plan antes de hacer cambios.',
      error: 'No se pudo entrar en modo plan.',
    }

    const zh = {
      label: '计划',
      enter: '进入计划模式',
      hint: '进入计划模式：代理先探索并提出计划，再做更改。',
      error: '无法进入计划模式。',
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
.dsh-plan-entry-error {
  min-width: 0;
  max-width: 180px;
  overflow: hidden;
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`

    /** Document-with-lines glyph for plan mode. */
    function PlanGlyph() {
      return h('svg', {
        viewBox: '0 0 14 14', width: 14, height: 14,
        fill: 'none', 'aria-hidden': 'true',
      }, [
        h('rect', {
          key: 'sheet',
          x: 3, y: 2.4, width: 8, height: 9.2, rx: 1.9,
          stroke: 'currentColor', strokeWidth: 1.3,
        }),
        h('path', {
          key: 'lines',
          d: 'M5.4 5.5h3.2M5.4 7.6h3.2M5.4 9.7h2',
          stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round',
        }),
      ])
    }

    /**
     * The composer's plan-mode entry control.
     * @param props seat runtime props (`useProjection`, `sessionId`, `t`) plus
     *   the injected `enterPlanMode` writer.
     */
    function PlanEntry({ useProjection, sessionId, enterPlanMode, t: translate }) {
      const t = typeof translate === 'function' ? translate : key => key
      const plan = useProjection(PLAN_PROJECTION)
      const [busy, setBusy] = useState(false)
      const [failure, setFailure] = useState(null)
      const inFlight = useRef(false)

      // A different Session owns different mode state.
      useEffect(() => {
        inFlight.current = false
        setBusy(false)
        setFailure(null)
      }, [sessionId])

      // Exactly the complement of the shipped chip: show only while the
      // settled log says plan mode is off. A pending entry hides this button
      // as soon as the chip appears, and a pending exit waits for the chip to
      // finish before the button returns.
      const visible = plan !== null && plan !== undefined && !plan.pending && plan.active === false
      if (!visible) return null

      const enter = () => {
        // The ref closes the same-tick gap that state cannot: two rapid clicks
        // must not dispatch twice.
        if (inFlight.current) return
        inFlight.current = true
        setBusy(true)
        setFailure(null)
        Promise.resolve()
          .then(() => enterPlanMode())
          .then(outcome => {
            inFlight.current = false
            setBusy(false)
            if (outcome !== undefined && outcome.ok === true) return
            setFailure(outcome !== undefined && typeof outcome.message === 'string'
              ? outcome.message
              : t('error'))
          }, reason => {
            inFlight.current = false
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
            'aria-label': t('enter'),
            'aria-busy': busy ? 'true' : undefined,
            // `aria-disabled` instead of `disabled` keeps keyboard focus in
            // place while the command is in flight; enter() ignores the click.
            'aria-disabled': busy ? 'true' : undefined,
            title: t('hint'),
            // Keep the caret in the composer: entering plan mode must not end the draft.
            onMouseDown: event => { event.preventDefault() },
            onClick: enter,
          }, [
            h('span', { key: 'glyph', className: 'dsh-plan-entry-glyph' }, h(PlanGlyph)),
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
        ctx.effect(() => ctx.locale.register(NS, { en, es, zh }), 'mode-switch: dictionaries')

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
          order: 0,
          locale: NS,
          inject: sessionId => ({
            // Entering rides the plan-mode package's own human command, so
            // the mode change stays a logged command.
            enterPlanMode: () => dispatch(sessionId, '/plan'),
          }),
        }, PlanEntry))
      },
    }
  },
})
