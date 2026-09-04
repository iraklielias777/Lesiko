import { supabase } from '../lib/supabase';

/**
 * Operator alerts written by the payments function (see migration 0019).
 * Read-only from the browser except for acknowledging; only the service role
 * can create one, so nothing a shopper does can put text on the dashboard.
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface OpsAlert {
  id: string;
  createdAt: string;
  kind: string;
  severity: AlertSeverity;
  message: string;
  context: Record<string, unknown>;
}

const mapAlert = (row: any): OpsAlert => ({
  id: row.id,
  createdAt: row.created_at,
  kind: row.kind,
  severity: row.severity,
  message: row.message,
  context: row.context || {},
});

export const OpsService = {
  getOpenAlerts: async (limit = 30): Promise<OpsAlert[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('ops_alerts')
      .select('id, created_at, kind, severity, message, context')
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error loading alerts:', error);
      return [];
    }
    return (data || []).map(mapAlert);
  },

  acknowledge: async (id: string, userId: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
      .from('ops_alerts')
      .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: userId })
      .eq('id', id);
    if (error) throw error;
  },
};
