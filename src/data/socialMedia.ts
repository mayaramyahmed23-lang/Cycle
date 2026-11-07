export interface SocialMediaItem {
  id: string;
  name: string;
  nameAr: string;
  handle: string;
  url: string;
  ariaLabel: string;
}

export const OFFICIAL_CYCLE_CONTACT = {
  email: 'contact.cycle.eg@gmail.com',
  mailto: 'mailto:contact.cycle.eg@gmail.com',
  tagline: {
    rethink: 'Rethink. Reuse. Recycle.',
    betterCycle: 'Making plastic part of a better cycle.',
    joinMovement: 'Join the movement'
  },
  taglineAr: {
    rethink: 'أعد التفكير. أعد الاستخدام. أعد التدوير.',
    betterCycle: 'جعل البلاستيك جزءاً من دورة أفضل.',
    joinMovement: 'انضم إلى الحركة'
  },
  socialMedia: [
    {
      id: 'instagram',
      name: 'Instagram',
      nameAr: 'إنستغرام',
      handle: '@cycle_initiative',
      url: 'https://www.instagram.com/cycle_initiative?igsi=MTNxemllNDBrMjVubQ==',
      ariaLabel: 'Follow Cycle on Instagram'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      nameAr: 'فيسبوك',
      handle: 'Cycle Initiative',
      url: 'https://www.facebook.com/share/19WESFUbtm/',
      ariaLabel: 'Follow Cycle on Facebook'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      nameAr: 'تيك توك',
      handle: '@cycle_initiative',
      url: 'https://www.tiktok.com/@cycle_initiative?lang=ar&is_from_webapp=1&sender_device=mobile&sender_web_id=7681076533565867541',
      ariaLabel: 'Follow Cycle on TikTok'
    }
  ] as SocialMediaItem[]
};
