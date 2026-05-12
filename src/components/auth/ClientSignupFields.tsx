import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ClientFieldsValue = {
  companyName: string;
  companyAddress: string;
  siteName: string;
  siteAddress: string;
};

export function ClientSignupFields({
  value,
  onChange,
}: {
  value: ClientFieldsValue;
  onChange: (v: ClientFieldsValue) => void;
}) {
  return (
    <div className="space-y-4 rounded-md border bg-muted/30 p-4">
      <div className="space-y-2">
        <Label htmlFor="sCompany">Company name</Label>
        <Input
          id="sCompany"
          required
          value={value.companyName}
          onChange={(e) => onChange({ ...value, companyName: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sCompanyAddr">Company address (optional)</Label>
        <Input
          id="sCompanyAddr"
          value={value.companyAddress}
          onChange={(e) =>
            onChange({ ...value, companyAddress: e.target.value })
          }
        />
      </div>
      <div className="pt-2 border-t space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Your first site
        </p>
        <div className="space-y-2">
          <Label htmlFor="siteName">Site name</Label>
          <Input
            id="siteName"
            required
            value={value.siteName}
            onChange={(e) => onChange({ ...value, siteName: e.target.value })}
            placeholder="e.g. M25 J7 works"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="siteAddr">Site address (optional)</Label>
          <Input
            id="siteAddr"
            value={value.siteAddress}
            onChange={(e) =>
              onChange({ ...value, siteAddress: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}
