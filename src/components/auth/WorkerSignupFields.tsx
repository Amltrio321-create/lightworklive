import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export type WorkerFieldsValue = {
  workerRef: string;
  trade: string;
  rightToWork: boolean;
  utrNumber: string;
};

// UK UTR: 10 digits, sometimes with trailing 'K'
export const UTR_REGEX = /^\d{10}K?$/i;
export function isValidUtr(v: string) {
  return UTR_REGEX.test(v.replace(/\s+/g, ""));
}

const TRADES = [
  "Traffic Marshal",
  "Labourer",
  "Banksman",
  "Skilled Operative",
  "Other",
];

export function WorkerSignupFields({
  value,
  onChange,
}: {
  value: WorkerFieldsValue;
  onChange: (v: WorkerFieldsValue) => void;
}) {
  return (
    <div className="space-y-4 rounded-md border bg-muted/30 p-4">
      <div className="space-y-2">
        <Label htmlFor="workerRef">Worker ID / CSCS card (optional)</Label>
        <Input
          id="workerRef"
          value={value.workerRef}
          onChange={(e) => onChange({ ...value, workerRef: e.target.value })}
          placeholder="e.g. CSCS 12345678"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="trade">Trade</Label>
        <select
          id="trade"
          required
          value={value.trade}
          onChange={(e) => onChange({ ...value, trade: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Select a trade…</option>
          {TRADES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="utr">UTR number (self-employed CIS)</Label>
        <Input
          id="utr"
          required
          inputMode="numeric"
          value={value.utrNumber}
          onChange={(e) => onChange({ ...value, utrNumber: e.target.value })}
          placeholder="10 digits, e.g. 1234567890"
        />
        <p className="text-xs text-muted-foreground">
          Required for CIS invoices. 10 digits (optionally followed by K).
        </p>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={value.rightToWork}
          onCheckedChange={(c) =>
            onChange({ ...value, rightToWork: c === true })
          }
          className="mt-0.5"
        />
        <span className="text-sm">
          I confirm I have the legal right to work in the UK.
        </span>
      </label>
    </div>
  );
}
