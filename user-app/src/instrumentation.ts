import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

const sdk = new NodeSDK({
  // Reads OTEL_EXPORTER_OTLP_ENDPOINT and appends /v1/traces
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Low-level noise you don't need in traces
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-http': {
        // Prometheus scrapes every 15s; don't create a trace for each scrape
        ignoreIncomingRequestHook: (req) => req.url === '/metrics',
      },
      '@opentelemetry/instrumentation-pino': {
        // Only add trace_id/span_id to log lines; Loki still handles log shipping
        disableLogSending: true,
      },
    }),
  ],
});

sdk.start();

export { sdk };
