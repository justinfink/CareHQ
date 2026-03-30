import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Phone, FileText, Check, ChevronDown, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'
import { trendData } from '../data/mockInsights'
import type { Insight, InsightSeverity } from '../types'

const severityConfig: Record<InsightSeverity, { icon: any; label: string; color: string; borderColor: string; bgColor: string }> = {
  alert: { icon: AlertCircle, label: 'NEEDS ATTENTION', color: 'var(--color-status-alert)', borderColor: 'border-[var(--color-status-alert)]', bgColor: 'bg-[var(--color-status-alert-bg)]' },
  warning: { icon: AlertTriangle, label: 'WATCH', color: 'var(--color-status-warning)', borderColor: 'border-[var(--color-status-warning)]', bgColor: 'bg-[var(--color-status-warning-bg)]' },
  info: { icon: Info, label: 'NOTE', color: 'var(--color-status-info)', borderColor: 'border-[var(--color-status-info)]', bgColor: 'bg-[var(--color-status-info-bg)]' },
  ok: { icon: CheckCircle2, label: 'GOING WELL', color: 'var(--color-status-ok)', borderColor: 'border-[var(--color-status-ok)]', bgColor: 'bg-[var(--color-status-ok-bg)]' },
}

function InsightCard({ insight }: { insight: Insight }) {
  const config = severityConfig[insight.severity]
  const Icon = config.icon
  const resolveInsight = useAppStore((s) => s.resolveInsight)
  const navigate = useNavigate()

  if (insight.resolved) return null

  return (
    <Card className={`border-l-4 ${config.borderColor} !rounded-[10px]`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color: config.color }} />
        <Badge variant={insight.severity}>{config.label}</Badge>
      </div>

      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{insight.title}</h3>
      <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-4">{insight.summary}</p>

      {insight.detail && (
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">{insight.detail}</p>
      )}

      {insight.suggestedAction && (
        <div className="border-t border-[var(--color-border-subtle)] pt-4 mb-4">
          <div className="text-xs font-semibold text-[var(--color-text-brand)] uppercase tracking-wider mb-2">What to do</div>
          <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">{insight.suggestedAction}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {insight.severity === 'alert' && insight.category === 'cognitive' && (
          <Button size="sm">
            <Phone size={14} />
            Call Dr. Kapoor
          </Button>
        )}
        {insight.suggestedAction && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/log')}
          >
            <FileText size={14} />
            Log an episode
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => resolveInsight(insight.id)}>
          <Check size={14} />
          Mark as resolved
        </Button>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
        <span className="text-xs text-[var(--color-text-tertiary)]">
          Based on events from March 25–29
        </span>
        <button
          onClick={() => navigate('/log')}
          className="text-xs text-[var(--color-text-brand)] font-medium hover:underline flex items-center gap-1 cursor-pointer"
        >
          View related events <ArrowRight size={12} />
        </button>
      </div>
    </Card>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="bg-white rounded-[10px] shadow-[var(--shadow-md)] p-3 text-xs">
      <div className="font-semibold text-[var(--color-text-primary)] mb-1.5">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[var(--color-text-secondary)] capitalize">{entry.name}:</span>
          <span className="font-medium text-[var(--color-text-primary)]">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Insights() {
  const insights = useAppStore((s) => s.insights)
  const [showGoodNews, setShowGoodNews] = useState(false)

  const attentionItems = insights.filter((i) => !i.resolved && (i.severity === 'alert' || i.severity === 'warning'))
  const infoItems = insights.filter((i) => !i.resolved && i.severity === 'info')
  const okItems = insights.filter((i) => !i.resolved && i.severity === 'ok')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Insights</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Week of March 23–29</p>
        {attentionItems.length > 0 && (
          <p className="text-sm text-[var(--color-text-primary)] font-medium mt-2">
            {attentionItems.length} thing{attentionItems.length > 1 ? 's' : ''} need{attentionItems.length === 1 ? 's' : ''} your attention.
          </p>
        )}
      </div>

      {/* Alert and warning cards */}
      <div className="space-y-4 mb-8">
        {attentionItems.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {/* Info cards */}
      {infoItems.length > 0 && (
        <div className="space-y-4 mb-8">
          {infoItems.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* Trends */}
      <Card className="mb-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Activity trends &mdash; past 8 weeks</h3>
        </div>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A7B6E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0A7B6E" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorMob" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F0A830" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F0A830" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorCog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#DC2626" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 12, fill: 'var(--color-text-tertiary)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="medication" stroke="#0A7B6E" fill="url(#colorMed)" strokeWidth={2} />
              <Area type="monotone" dataKey="mobility" stroke="#F0A830" fill="url(#colorMob)" strokeWidth={2} />
              <Area type="monotone" dataKey="cognitive" stroke="#2563EB" fill="url(#colorCog)" strokeWidth={2} />
              <Area type="monotone" dataKey="incidents" stroke="#DC2626" fill="url(#colorInc)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-5 mt-4">
          {[
            { label: 'Medication', color: '#0A7B6E' },
            { label: 'Mobility', color: '#F0A830' },
            { label: 'Cognitive', color: '#2563EB' },
            { label: 'Incidents', color: '#DC2626' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
        </div>
      </Card>

      {/* What's going well */}
      {okItems.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setShowGoodNews(!showGoodNews)}
            className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            <ChevronDown size={16} className={`transition-transform ${showGoodNews ? 'rotate-180' : ''}`} />
            What&apos;s going well
          </button>
          <AnimatePresence>
            {showGoodNews && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-3"
              >
                <div className="space-y-4">
                  {okItems.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
