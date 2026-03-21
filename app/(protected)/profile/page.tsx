import { getProfile } from "@/app/profile/actions";
import { getUserApiKeyHints } from "@/app/profile/api-key-actions";
import { ProfileForm } from "./components/ProfileForm";
import { ApiKeysForm } from "./components/ApiKeysForm";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const result = await getProfile();

  if (result.error || !result.data) {
    redirect("/auth/login");
  }

  const apiKeysResult = await getUserApiKeyHints();

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col items-center gap-6">
        <ProfileForm initialUsername={result.data.username || ""} />
        <ApiKeysForm initialKeys={apiKeysResult.data ?? []} />
      </div>
    </div>
  );
}
