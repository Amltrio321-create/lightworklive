import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export type WorkerFieldsValue = {
  workerRef: string;
  trade: string;
  rightToWork: boolean;
  utrNumber: string;
  qualifications: string[];
  drivingLicence: string;
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

// Common UK traffic-management & site qualifications
export const QUALIFICATIONS: { value: string; label: string }[] = [
  { value: "TTMBC", label: "TTMBC" },
  { value: "T1", label: "T1" },
  { value: "T2", label: "T2" },
  { value: "M1", label: "M1" },
  { value: "M2", label: "M2" },
  { value: "M3", label: "M3" },
  { value: "M4", label: "M4" },
  { value: "M5", label: "M5" },
  { value: "M6", label: "M6" },
  { value: "12AB", label: "12/AB" },
  { value: "12D", label: "12D" },
  { value: "LANTRA_TTO", label: "Lantra TTO" },
  { value: "SLG", label: "SLG" },
  { value: "CSCS", label: "CSCS card" },
  { value: "FIRST_AID", label: "First Aid" },
];

const DRIVING_LICENCES = [
  { value: "", label: "None" },
  { value: "B", label: "Car (B)" },
  { value: "BE", label: "Car + trailer (B+E)" },
  { value: "C1", label: "Medium lorry (C1)" },
  { value: "C", label: "Lorry (C)" },
  { value: "CE", label: "Lorry + trailer (C+E)" },
  { value: "D1", label: "Minibus (D1)" },
  { value: "D", label: "Bus (D)" },
];

export function WorkerSignupFields({
  value,
  onChange,
}: {
  value: WorkerFieldsValue;
  onChange: (v: WorkerFieldsValue) => void;
}) {
  const toggleQual = (q: string, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...value.qualifications, q]))
      : value.qualifications.filter((x) => x !== q);
    onChange({ ...value, qualifications: next });
  };

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
        <Label>Qualifications</Label>
        <p className="text-xs text-muted-foreground">
          Tick all the cards / tickets you currently hold.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUALIFICATIONS.map((q) => {
            const checked = value.qualifications.includes(q.value);
            return (
              <label
                key={q.value}
                className={`flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 cursor-pointer text-sm ${
                  checked ? "border-primary ring-1 ring-primary" : ""
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => toggleQual(q.value, c === true)}
                />
                <span>{q.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="drivingLicence">Driving licence</Label>
        <select
          id="drivingLicence"
          value={value.drivingLicence}
          onChange={(e) => onChange({ ...value, drivingLicence: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {DRIVING_LICENCES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
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
