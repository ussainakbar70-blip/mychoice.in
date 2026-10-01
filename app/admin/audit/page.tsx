"use client";

import React, { useState, useEffect } from "react";
import { FileText, RefreshCw, Clock, ShieldCheck, Activity } from "lucide-react";
import { adminGetAuditLogs, AuditLogRecord } from "@/lib/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await adminGetAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            System &amp; Administrative Audit Logs
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Chronological audit trail of order adjustments, catalog modifications, and store configuration changes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadLogs} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Audit Trail
        </Button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-neutral-400">Loading audit trail...</div>
        ) : logs.length > 0 ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {logs.map((log) => (
              <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">
                      {log.entityType}
                    </Badge>
                    <span className="font-mono font-bold text-neutral-900 dark:text-white">
                      {log.action}
                    </span>
                    {log.entityId && (
                      <span className="text-neutral-400 font-mono text-[11px]">
                        ID: {log.entityId}
                      </span>
                    )}
                  </div>
                  {log.metadata && (
                    <pre className="text-[11px] text-neutral-500 bg-neutral-50 dark:bg-neutral-850 p-2 rounded-lg font-mono overflow-x-auto max-w-2xl">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>

                <div className="text-right shrink-0 text-neutral-400 text-[11px]">
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-neutral-400">No audit events recorded yet.</div>
        )}
      </div>
    </div>
  );
}
