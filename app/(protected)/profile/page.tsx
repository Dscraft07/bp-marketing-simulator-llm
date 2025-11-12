import { getProfile } from "@/app/profile/actions";
import { ProfileForm } from "./components/ProfileForm";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const result = await getProfile();

  if (result.error || !result.data) {
    redirect("/auth/login");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-center">
        <ProfileForm initialUsername={result.data.username || ""} />
      </div>
    </div>
  );
}
