import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { ImageUploadField } from '@/components/ImageUploadField';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHydrated } from '@/hooks/useAuthHydrated';
import { useMyProfile, useUpdateProfile, useUploadProfileImage } from '@/hooks/useApi';
import { notify } from '@/lib/toast';
import { resolveImageUrl } from '@/lib/imageUrl';

export function EditProfilePage() {
  const hydrated = useAuthHydrated();
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const { data: profile } = useMyProfile(hydrated && isAuthenticated);
  const updateProfile = useUpdateProfile();
  const uploadImage = useUploadProfileImage();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [discord, setDiscord] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    setBio(profile.bio ?? '');
    setWebsite(profile.website ?? '');
    setTwitter(profile.twitter ?? '');
    setInstagram(profile.instagram ?? '');
    setDiscord(profile.discord ?? '');
  }, [profile]);

  if (!hydrated) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const displayProfile = profile ?? user;

  const handleSave = async () => {
    try {
      const updated = await updateProfile.mutateAsync({
        name: name.trim(),
        bio: bio.trim(),
        website: website.trim(),
        twitter: twitter.trim(),
        instagram: instagram.trim(),
        discord: discord.trim(),
      });
      updateUser(updated);
      notify.success('Profile updated');
    } catch {
      notify.error('Could not update profile');
    }
  };

  const handleUpload = async (kind: 'avatar' | 'banner', file: File | null) => {
    if (!file) return;
    try {
      const updated = await uploadImage.mutateAsync({ kind, file });
      updateUser(updated);
      notify.success(`${kind === 'avatar' ? 'Avatar' : 'Banner'} updated`);
      if (kind === 'avatar') setAvatarFile(null);
      else setBannerFile(null);
    } catch {
      notify.error(`Could not upload ${kind}`);
    }
  };

  const bannerPreview = bannerFile
    ? URL.createObjectURL(bannerFile)
    : resolveImageUrl(displayProfile?.bannerUrl ?? undefined);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <PageHeader
        title="Edit profile"
        subtitle="Update how others see you on VividCraft."
      />

      <div className="glass-panel p-5 sm:p-6 mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-content">Banner</h2>
        {bannerPreview && (
          <div
            className="h-32 rounded-xl bg-brand-primary bg-cover bg-center border border-surface-border"
            style={{ backgroundImage: `url(${bannerPreview})` }}
          />
        )}
        <ImageUploadField file={bannerFile} onChange={setBannerFile} />
        {bannerFile && (
          <button
            type="button"
            onClick={() => handleUpload('banner', bannerFile)}
            disabled={uploadImage.isPending}
            className="btn-secondary py-2 px-4 text-sm"
          >
            Upload banner
          </button>
        )}
      </div>

      <div className="glass-panel p-5 sm:p-6 mb-6 space-y-4">
        <div className="flex items-center gap-4">
          <ProfileAvatar
            name={displayProfile?.name ?? 'User'}
            avatarUrl={avatarFile ? URL.createObjectURL(avatarFile) : displayProfile?.avatarUrl}
            size="lg"
          />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-content mb-2">Avatar</h2>
            <ImageUploadField file={avatarFile} onChange={setAvatarFile} />
            {avatarFile && (
              <button
                type="button"
                onClick={() => handleUpload('avatar', avatarFile)}
                disabled={uploadImage.isPending}
                className="btn-secondary py-2 px-4 text-sm mt-2"
              >
                Upload avatar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel p-5 sm:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-content mb-1.5">Display name</label>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-content mb-1.5">Bio</label>
          <textarea
            className="input-field resize-none"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the community about yourself..."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content mb-1.5">Website</label>
            <input className="input-field" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1.5">Twitter</label>
            <input className="input-field" value={twitter} onChange={(e) => setTwitter(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1.5">Instagram</label>
            <input className="input-field" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-content mb-1.5">Discord</label>
            <input className="input-field" value={discord} onChange={(e) => setDiscord(e.target.value)} />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="btn-primary py-2 px-4 text-sm"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
