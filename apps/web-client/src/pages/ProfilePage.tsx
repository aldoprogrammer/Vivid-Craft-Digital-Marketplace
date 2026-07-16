import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { SocialLinks } from '@/components/profile/SocialLinks';
import { ProfileLibraryList, ProfileProductGrid } from '@/components/profile/ProfileProductGrid';
import { EmptyState } from '@/components/EmptyState';
import { useAuthStore } from '@/stores/authStore';
import {
  useCreatorListings,
  useProfileLibrary,
  useProfileTopProducts,
  usePublicProfile,
  useUserFavorites,
} from '@/hooks/useApi';
import { resolveImageUrl } from '@/lib/imageUrl';

type ProfileTab = 'listings' | 'favorites' | 'library';

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuthStore();
  const isOwnProfile = currentUser?.id === userId;

  const [tab, setTab] = useState<ProfileTab>('favorites');

  const { data: profile, isLoading, error } = usePublicProfile(userId);
  const isCreator = profile?.role === 'CREATOR';

  useEffect(() => {
    if (profile?.role === 'CREATOR') setTab('listings');
    else setTab('favorites');
  }, [profile?.role]);

  const { data: listings = [] } = useCreatorListings(isCreator ? userId : undefined);
  const { data: topProducts = [] } = useProfileTopProducts(userId, !!isCreator);
  const { data: favorites = [] } = useUserFavorites(!isCreator ? userId : undefined);
  const { data: library = [] } = useProfileLibrary(!isCreator ? userId : undefined);

  const topProductIds = topProducts.map((p) => p.productId);
  const bannerSrc = resolveImageUrl(profile?.bannerUrl ?? undefined);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <EmptyState
        icon="👤"
        title="Profile not found"
        description="This user may not exist or is inactive."
        actionLabel="Back to Marketplace"
        actionTo="/"
      />
    );
  }

  const tabs: { id: ProfileTab; label: string; show: boolean }[] = [
    { id: 'listings', label: 'Listings', show: isCreator },
    { id: 'favorites', label: 'Favorites', show: !isCreator },
    { id: 'library', label: 'Owned', show: !isCreator },
  ].filter((t) => t.show);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="glass-panel overflow-hidden mb-8">
        <div
          className="h-36 sm:h-48 bg-brand-primary relative"
          style={
            bannerSrc
              ? { backgroundImage: `url(${bannerSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-[rgba(23,19,31,0.45)]" />
        </div>
        <div className="px-5 sm:px-8 pb-6 -mt-12 sm:-mt-14 relative">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <ProfileAvatar name={profile.name} avatarUrl={profile.avatarUrl} size="xl" />
              <div className="pb-1">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-content">{profile.name}</h1>
                <p className="text-sm text-mist uppercase tracking-wider mt-1">{profile.role}</p>
              </div>
            </div>
            {isOwnProfile && (
              <Link to="/profile/edit" className="btn-primary py-2 px-4 text-sm">
                Edit profile
              </Link>
            )}
          </div>
          {profile.bio && <p className="text-sm text-content leading-relaxed mt-4 max-w-2xl">{profile.bio}</p>}
          <div className="mt-4">
            <SocialLinks
              website={profile.website}
              twitter={profile.twitter}
              instagram={profile.instagram}
              discord={profile.discord}
            />
          </div>
          {isCreator && topProducts.length > 0 && (
            <p className="text-xs text-mist mt-4">
              Top seller: <span className="text-content font-medium">{topProducts[0].productName}</span>
              {' '}· {topProducts[0].sales} sales
            </p>
          )}
        </div>
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-brand-primary text-white'
                  : 'bg-surface-elevated text-mist hover:text-content'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'listings' && isCreator && (
        <ProfileProductGrid
          products={listings}
          topProductIds={topProductIds}
          emptyTitle="No listings yet"
          emptyDescription="Published products will appear on this creator profile."
        />
      )}

      {tab === 'favorites' && !isCreator && (
        <ProfileProductGrid
          products={favorites}
          emptyTitle="No favorites yet"
          emptyDescription="Saved products will appear here."
        />
      )}

      {tab === 'library' && !isCreator && <ProfileLibraryList items={library} />}
    </div>
  );
}
