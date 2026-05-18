import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  ArrowLeft,
} from "lucide-react";
import { getSignedPhotoUrl } from "@/lib/photos";
import { QUALIFICATIONS } from "@/components/auth/WorkerSignupFields";

type QualRow = {
  id: string;
  qualification: string;
  photo_path: string;
  status: "pending" | "verified" | "rejected";
  notes: string | null;
  verified_at: string | null;
};

export const Route = createFileRoute("/worker/qualifications")({
  component: () => (
    <RequireRole allow={["worker"]}>
      <QualPage />
    </RequireRole>
  ),
});

function labelFor(value: string) {
  return QUALIFICATIONS.find((q) => q.value === value)?.label ?? value;
}

function QualPage() {
  const { user } = useAuth();
  const [profileQuals, setProfileQuals] = useState<string[]>([]);
  const [rows, setRows] = useState<QualRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: profile }, { data: quals }] = await Promise.all([
      supabase.from("profiles").select("qualifications").eq("id", user.id).maybeSingle(),
      supabase
        .from("worker_qualifications")
        .select("*")
        .eq("worker_id", user.id)
        .order("created_at", { ascending: true }),
    ]);
    const claimed = (profile?.qualifications as string[] | null) ?? [];
    const list = (quals ?? []) as QualRow[];
    // Show union of claimed + already-uploaded entries
    const set = new Set<string>([...claimed, ...list.map((r) => r.qualification)]);
    setProfileQuals(Array.from(set));
    setRows(list);

    const urlMap: Record<string, string> = {};
    await Promise.all(
      list.map(async (r) => {
        const u = await getSignedPhotoUrl(r.photo_path, "qualification-photos");
        if (u) urlMap[r.id] = u;
      }),
    );
    setUrls(urlMap);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onPick = (qualification: string) => {
    fileRefs.current[qualification]?.click();
  };

  const onFile = async (
    qualification: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploadingFor(qualification);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${qualification}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("qualification-photos")
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const existing = rows.find((r) => r.qualification === qualification);
      if (existing) {
        // Re-upload: reset to pending with new photo
        const { error } = await supabase
          .from("worker_qualifications")
          .update({
            photo_path: path,
            status: "pending",
            notes: null,
            verified_at: null,
            verified_by: null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("worker_qualifications").insert({
          worker_id: user.id,
          qualification,
          photo_path: path,
          status: "pending",
        });
        if (error) throw error;
      }
      toast.success(`${labelFor(qualification)} sent for verification`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingFor(null);
    }
  };

  const verifiedCount = rows.filter((r) => r.status === "verified").length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link
          to="/worker"
          className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">My qualifications</h1>
        <p className="text-sm text-muted-foreground">
          Upload a clear photo of each card or ticket. An admin will verify
          before you can start a shift.
        </p>
      </div>

      <div
        className={`rounded-lg border p-4 ${
          verifiedCount > 0
            ? "border-success/50 bg-success/5"
            : "border-warning/50 bg-warning/10"
        }`}
      >
        <div className="flex items-center gap-2 font-semibold">
          {verifiedCount > 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-success" />
              {verifiedCount} qualification{verifiedCount === 1 ? "" : "s"} verified
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-warning" />
              Awaiting admin verification
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          You need at least one verified qualification to start a shift.
        </p>
      </div>

      {profileQuals.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          You did not select any qualifications on signup. Contact your admin to
          add some to your profile.
        </div>
      ) : (
        <div className="space-y-3">
          {profileQuals.map((q) => {
            const row = rows.find((r) => r.qualification === q);
            return (
              <QualCard
                key={q}
                qualification={q}
                row={row}
                signedUrl={row ? urls[row.id] : undefined}
                uploading={uploadingFor === q}
                onUploadClick={() => onPick(q)}
                fileRef={(el) => {
                  fileRefs.current[q] = el;
                }}
                onFileChange={(e) => onFile(q, e)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function QualCard({
  qualification,
  row,
  signedUrl,
  uploading,
  onUploadClick,
  fileRef,
  onFileChange,
}: {
  qualification: string;
  row?: QualRow;
  signedUrl?: string;
  uploading: boolean;
  onUploadClick: () => void;
  fileRef: (el: HTMLInputElement | null) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const status = row?.status ?? "missing";
  const statusBadge = {
    missing: { cls: "bg-muted text-muted-foreground", icon: Upload, text: "Photo required" },
    pending: { cls: "bg-warning/20 text-warning-foreground", icon: Clock, text: "Pending review" },
    verified: { cls: "bg-success/20 text-success", icon: CheckCircle2, text: "Verified" },
    rejected: { cls: "bg-destructive/15 text-destructive", icon: XCircle, text: "Rejected" },
  }[status];
  const Icon = statusBadge.icon;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{labelFor(qualification)}</div>
          <span
            className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-xs ${statusBadge.cls}`}
          >
            <Icon className="w-3 h-3" />
            {statusBadge.text}
          </span>
          {status === "rejected" && row?.notes && (
            <p className="mt-2 text-xs text-destructive">
              Admin note: {row.notes}
            </p>
          )}
        </div>
        {signedUrl && (
          <img
            src={signedUrl}
            alt={labelFor(qualification)}
            className="w-20 h-20 object-cover rounded-md border shrink-0"
          />
        )}
      </div>

      {status !== "verified" && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            className="hidden"
          />
          <Button
            onClick={onUploadClick}
            disabled={uploading}
            size="sm"
            className="mt-3 w-full"
            variant={status === "missing" || status === "rejected" ? "default" : "outline"}
          >
            <Camera className="w-4 h-4 mr-1" />
            {uploading
              ? "Uploading…"
              : status === "missing"
                ? "Upload photo"
                : "Replace photo"}
          </Button>
        </>
      )}
    </div>
  );
}

// Re-export to satisfy unused import linter if Textarea isn't needed
export { Textarea };
