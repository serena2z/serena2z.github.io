export const personalContent = {
  projects: [] as { title: string; description: string; url: string }[],
  essays: [] as { id: string; title: string; date: string; body: string[] }[],
  papers: [] as {
    id: string;
    title: string;
    authors: string;
    note: string;
    url: string;
    contribution?: string;
  }[],
  photos: [] as {
    id: string;
    src: string;
    title: string;
    alt: string;
    width: number;
    height: number;
    location?: string;
    year?: string;
  }[],
  creative: [] as ({
    id: string;
    title: string;
    src: string;
    alt: string;
  } & (
    | { medium: 'Drawing'; width: number; height: number }
    | { medium: 'Video'; captions: string }
  ))[],
  shared: [
    {
      id: 'world-in-a-browser',
      title: 'A world inside a browser',
      creator: 'A reference I shared',
      note: 'The 3D website reference that helped inspire this little place.',
      url: 'https://www.youtube.com/watch?v=SKk44nKF9_8',
    },
  ] as {
    id: string;
    title: string;
    creator: string;
    note: string;
    url: string;
  }[],
};
