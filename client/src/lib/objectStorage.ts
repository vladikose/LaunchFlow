import orangeCatAvatar from "@assets/generated_images/orange_tabby_cat_avatar.png";
import grayCatAvatar from "@assets/generated_images/gray_fluffy_cat_avatar.png";
import blackCatAvatar from "@assets/generated_images/black_cat_avatar.png";
import whiteCatAvatar from "@assets/generated_images/white_cat_avatar.png";
import calicoCatAvatar from "@assets/generated_images/calico_cat_avatar.png";
import siameseCatAvatar from "@assets/generated_images/siamese_cat_avatar.png";
import coolCatAvatar from "@assets/generated_images/cool_ginger_cat_avatar.png";
import tuxedoCatAvatar from "@assets/generated_images/tuxedo_cat_avatar.png";

const PRESET_AVATAR_MAP: Record<string, string> = {
  "preset:orange": orangeCatAvatar,
  "preset:gray": grayCatAvatar,
  "preset:black": blackCatAvatar,
  "preset:white": whiteCatAvatar,
  "preset:calico": calicoCatAvatar,
  "preset:siamese": siameseCatAvatar,
  "preset:cool": coolCatAvatar,
  "preset:tuxedo": tuxedoCatAvatar,
};

export function getObjectUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  
  if (url.startsWith('preset:')) {
    return PRESET_AVATAR_MAP[url] || undefined;
  }
  
  if (url.startsWith('/@fs/') || url.includes('attached_assets/generated_images')) {
    const filename = url.split('/').pop();
    if (filename?.includes('orange')) return PRESET_AVATAR_MAP["preset:orange"];
    if (filename?.includes('gray')) return PRESET_AVATAR_MAP["preset:gray"];
    if (filename?.includes('black')) return PRESET_AVATAR_MAP["preset:black"];
    if (filename?.includes('white')) return PRESET_AVATAR_MAP["preset:white"];
    if (filename?.includes('calico')) return PRESET_AVATAR_MAP["preset:calico"];
    if (filename?.includes('siamese')) return PRESET_AVATAR_MAP["preset:siamese"];
    if (filename?.includes('cool') || filename?.includes('ginger')) return PRESET_AVATAR_MAP["preset:cool"];
    if (filename?.includes('tuxedo')) return PRESET_AVATAR_MAP["preset:tuxedo"];
    return url;
  }
  
  if (url.startsWith('/objects/')) {
    return url;
  }
  if (url.includes('storage.googleapis.com')) {
    const match = url.match(/\/(?:\.private\/)?(uploads\/[^?]+)/);
    if (match) {
      return `/objects/${match[1]}`;
    }
  }
  return url;
}

export function isPresetAvatar(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('preset:') || url.startsWith('/@fs/') || url.includes('attached_assets/generated_images');
}
