"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertApiKey, deleteApiKey } from "@/app/profile/api-key-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff, Trash2 } from "lucide-react";

interface ApiKeyHint {
  provider: string;
  key_hint: string;
  updated_at: string;
}

interface ApiKeysFormProps {
  initialKeys: ApiKeyHint[];
}

const PROVIDERS = [
  { value: "openai", label: "OpenAI", placeholder: "sk-..." },
  { value: "xai", label: "xAI (Grok)", placeholder: "xai-..." },
] as const;

export function ApiKeysForm({ initialKeys }: ApiKeysFormProps) {
  const router = useRouter();
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<string | null>(null);

  const getKeyHint = (provider: string) => {
    return initialKeys.find((k) => k.provider === provider);
  };

  const handleSave = async (provider: string) => {
    if (!apiKeyValue.trim()) {
      toast.error("Please enter an API key.");
      return;
    }

    setSavingProvider(provider);

    const formData = new FormData();
    formData.append("provider", provider);
    formData.append("apiKey", apiKeyValue.trim());

    const result = await upsertApiKey(formData);

    if (!result.success) {
      toast.error(result.error || "Failed to save API key.");
    } else {
      toast.success("API key saved successfully!");
      setEditingProvider(null);
      setApiKeyValue("");
      setShowKey(false);
      router.refresh();
    }

    setSavingProvider(null);
  };

  const handleDelete = async (provider: string) => {
    setDeletingProvider(provider);

    const result = await deleteApiKey(provider);

    if (!result.success) {
      toast.error(result.error || "Failed to delete API key.");
    } else {
      toast.success("API key removed.");
      router.refresh();
    }

    setDeletingProvider(null);
  };

  const handleStartEdit = (provider: string) => {
    setEditingProvider(provider);
    setApiKeyValue("");
    setShowKey(false);
  };

  const handleCancel = () => {
    setEditingProvider(null);
    setApiKeyValue("");
    setShowKey(false);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Add your own API keys for LLM providers. Keys are used when running
          simulations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {PROVIDERS.map((provider) => {
          const existing = getKeyHint(provider.value);
          const isEditing = editingProvider === provider.value;
          const isSaving = savingProvider === provider.value;
          const isDeleting = deletingProvider === provider.value;

          return (
            <div key={provider.value} className="space-y-2">
              <Label>{provider.label}</Label>

              {isEditing ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      placeholder={provider.placeholder}
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      disabled={isSaving}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleSave(provider.value)}
                    disabled={isSaving}
                    size="sm"
                  >
                    {isSaving && (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    )}
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              ) : existing ? (
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {existing.key_hint}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartEdit(provider.value)}
                  >
                    Update
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(provider.value)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartEdit(provider.value)}
                  >
                    Add API Key
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
