import { useEffect, useState } from 'react';
import { useLocale } from '../i18n';

interface GithubProfile {
  avatar_url: string;
  html_url: string;
  name: string | null;
  login: string;
  bio: string | null;
  location: string | null;
  blog: string;
  email: string | null;
  twitter_username: string | null;
  company: string | null;
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

interface ContactUsModalProps {
  username: string;
  onClose: () => void;
  publicEmail?: string;
  linkedInUrl?: string;
}

export default function ContactUsModal({ username, onClose, publicEmail, linkedInUrl }: ContactUsModalProps) {
  const { t } = useLocale();
  const [profile, setProfile] = useState<GithubProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      const response = await fetch(`https://api.github.com/users/${username}`, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`${t.contactLoadError} (${response.status})`);
      }
      const data = (await response.json()) as GithubProfile;
      setProfile(data);
      setLoading(false);
    };

    load().catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : t.contactLoadError);
      setLoading(false);
    });

    return () => controller.abort();
  }, [username, t.contactLoadError]);

  const website = profile?.blog ? normalizeUrl(profile.blog) : '';
  const linkedIn = linkedInUrl ? normalizeUrl(linkedInUrl) : '';
  const email = publicEmail ?? profile?.email ?? null;
  const twitter = profile?.twitter_username ?? null;
  const hasContactInfo = Boolean(profile || email || linkedIn);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal contact-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-x" onClick={onClose}>✕</button>
        <h2 className="dish-title">{t.contactInfo}</h2>
        <div className="flourish"><span>✉</span></div>

        {loading && <p className="contact-line">{t.loadingContact}</p>}
        {error && <p className="contact-line contact-error">{error}</p>}

        {hasContactInfo && (
          <div className="contact-wrap">
            {profile && <img className="contact-avatar" src={profile.avatar_url} alt={profile.login} width={96} height={96} />}
            {profile && <p className="contact-note-badge">{t.contactProjectNote}</p>}
            {profile && <div className="contact-line"><b>GitHub:</b> <a href={profile.html_url} target="_blank" rel="noreferrer">{profile.login}</a></div>}
            {profile?.name && <div className="contact-line"><b>Name:</b> {profile.name}</div>}
            {profile?.bio && <div className="contact-line"><b>Bio:</b> {profile.bio}</div>}
            {profile?.location && <div className="contact-line"><b>Location:</b> {profile.location}</div>}
            {profile?.company && <div className="contact-line"><b>Company:</b> {profile.company}</div>}
            {email && <div className="contact-line"><b>Email:</b> <a href={`mailto:${email}`}>{email}</a></div>}
            {linkedIn && <div className="contact-line"><b>LinkedIn:</b> <a href={linkedIn} target="_blank" rel="noreferrer">{linkedInUrl}</a></div>}
            {website && profile && <div className="contact-line"><b>Website:</b> <a href={website} target="_blank" rel="noreferrer">{profile.blog}</a></div>}
            {twitter && (
              <div className="contact-line">
                <b>X:</b> <a href={`https://x.com/${twitter}`} target="_blank" rel="noreferrer">@{twitter}</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
