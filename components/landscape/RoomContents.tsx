'use client';
import Image from 'next/image';
import {
  ArrowUpRight,
  Camera,
  BookOpen,
  Feather,
  Compass,
  Code2,
  type LucideIcon,
} from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';
import { personalContent } from '@/lib/personal-content';
import type { Room } from '@/lib/landscape-config';

function CollectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="collection-heading">
      <h3>{title}</h3>
      <span>{String(count).padStart(2, '0')}</span>
    </div>
  );
}

function CollectionEmpty({
  icon: Icon,
  title,
  description,
  topics,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  topics: string[];
}) {
  return (
    <Empty className="reading-empty">
      <EmptyHeader>
        <EmptyMedia>
          <Icon size={27} strokeWidth={1.25} aria-hidden="true" />
        </EmptyMedia>
        <p className="empty-eyebrow">A collection in the making</p>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <div className="collection-topics" aria-label="Collection topics">
        {topics.map((topic) => (
          <span key={topic}>{topic}</span>
        ))}
      </div>
    </Empty>
  );
}

export default function RoomContents({
  room,
  onPhoto,
}: {
  room: Room;
  onPhoto: (id: string) => void;
}) {
  if (room.id === 'work')
    return (
      <div className="reading-body work-collection">
        <section className="current-chapter" aria-label="Current work">
          <div className="chapter-status">
            <span aria-hidden="true" />
            Currently
          </div>
          <div className="chapter-role">
            <h3>Phylo</h3>
            <p>Engineering</p>
          </div>
          <Code2
            className="chapter-icon"
            size={28}
            strokeWidth={1.1}
            aria-hidden="true"
          />
        </section>
        <CollectionHeading
          title="Projects & experiments"
          count={personalContent.projects.length + 1}
        />
        <div className="project-grid">
          <article className="project-card featured-project">
            <div className="project-meta">
              <span>01</span>
              <span>Personal website</span>
            </div>
            <h3>This little world.</h3>
            <p>
              An interactive landscape for the things I make, the ideas I
              follow, and the moments I want to keep.
            </p>
            <div className="project-tags">
              <span>Three.js</span>
              <span>Design & code</span>
              <span>Interactive worlds</span>
            </div>
            <div className="project-footnote">
              <Compass size={18} strokeWidth={1.3} aria-hidden="true" />
              <span>You’re standing in it.</span>
            </div>
          </article>
          {personalContent.projects.map((project, i) => (
            <article className="project-card" key={project.url}>
              <div className="project-meta">
                <span>{String(i + 2).padStart(2, '0')}</span>
                <span>Project</span>
              </div>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <a
                className="reading-link"
                href={project.url}
                target="_blank"
                rel="noreferrer"
              >
                Explore project <ArrowUpRight size={15} />
              </a>
            </article>
          ))}
        </div>
      </div>
    );
  if (room.id === 'writing')
    return (
      <div className="reading-body writing-collection">
        {personalContent.essays.length ? (
          <>
            <CollectionHeading
              title="Essays & observations"
              count={personalContent.essays.length}
            />
            {personalContent.essays.map((essay, i) => (
              <article className="essay-page" key={essay.id}>
                <header>
                  <span className="essay-index">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="document-kicker">{essay.date}</p>
                  <h3>{essay.title}</h3>
                </header>
                <div className="essay-prose">
                  {essay.body.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </>
        ) : (
          <CollectionEmpty
            icon={Feather}
            title="A quiet page, for now."
            description="Essays, observations, and notes in the margins will be collected here."
            topics={['Essays', 'Observations', 'Notes']}
          />
        )}
      </div>
    );
  if (room.id === 'research')
    return (
      <div className="reading-body research-collection">
        {personalContent.papers.length ? (
          <>
            <CollectionHeading
              title="Papers & reading notes"
              count={personalContent.papers.length}
            />
            <div className="research-list">
              {personalContent.papers.map((paper, i) => (
                <article className="research-paper" key={paper.id}>
                  <span className="paper-number">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="document-kicker">
                      {paper.contribution ? 'Contributed to' : 'Reading notes'}
                    </p>
                    <h3>{paper.title}</h3>
                    <p className="document-meta">{paper.authors}</p>
                    <p>{paper.note}</p>
                    {paper.contribution && (
                      <div className="contribution-note">
                        <span>My contribution</span>
                        <p>{paper.contribution}</p>
                      </div>
                    )}
                    <a
                      className="reading-link"
                      href={paper.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Read the paper <ArrowUpRight size={15} />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <CollectionEmpty
            icon={BookOpen}
            title="Questions worth following."
            description="Research papers, contributions, and close reading will find their home here."
            topics={['Research', 'Contributions', 'Reading notes']}
          />
        )}
      </div>
    );
  if (room.id === 'creative')
    return (
      <div className="reading-body creative-collection">
        {!!personalContent.photos.length && (
          <>
            <CollectionHeading
              title="Through my eyes"
              count={personalContent.photos.length}
            />
            <div className="photographs">
              {personalContent.photos.map((photo, i) => (
                <button
                  className="photograph-card"
                  key={photo.id}
                  onClick={() => onPhoto(photo.id)}
                  aria-label={`View ${photo.title}`}
                >
                  <div className="photo-mount">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      width={photo.width}
                      height={photo.height}
                      unoptimized
                      loading="lazy"
                    />
                  </div>
                  <div className="photo-caption">
                    <span className="photo-number">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3>{photo.title}</h3>
                      {(photo.location || photo.year) && (
                        <p>
                          {[photo.location, photo.year]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <ArrowUpRight size={17} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
        {!!personalContent.creative.length && (
          <>
            <CollectionHeading
              title="Studies & moving images"
              count={personalContent.creative.length}
            />
            <div className="creative-studies">
              {personalContent.creative.map((item) => (
                <figure key={item.id}>
                  {item.medium === 'Video' ? (
                    <video
                      src={item.src}
                      controls
                      preload="metadata"
                      aria-label={item.alt}
                    >
                      <track
                        kind="captions"
                        src={item.captions}
                        srcLang="en"
                        label="English"
                        default
                      />
                    </video>
                  ) : (
                    <Image
                      src={item.src}
                      alt={item.alt}
                      width={item.width}
                      height={item.height}
                      unoptimized
                      loading="lazy"
                    />
                  )}
                  <figcaption>
                    <span>{item.medium}</span>
                    <strong>{item.title}</strong>
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
        {!personalContent.photos.length && !personalContent.creative.length && (
          <CollectionEmpty
            icon={Camera}
            title="A place for the moments."
            description="My photographs, drawings, and films will be displayed here. The walls are waiting."
            topics={['Photography', 'Drawing', 'Film']}
          />
        )}
      </div>
    );
  return (
    <div className="reading-body inspiration-collection">
      <CollectionHeading
        title="Worth passing along"
        count={personalContent.shared.length}
      />
      <div className="inspiration-list">
        {personalContent.shared.map((item, i) => (
          <a
            className="discovery-card"
            href={item.url}
            target="_blank"
            rel="noreferrer"
            key={item.id}
          >
            <div className="discovery-mark" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </div>
            <div>
              <p className="document-kicker">{item.creator}</p>
              <h3>{item.title}</h3>
              <p>{item.note}</p>
              <span className="discovery-link">
                Take a look <ArrowUpRight size={15} />
              </span>
            </div>
            <ArrowUpRight
              className="discovery-arrow"
              size={24}
              strokeWidth={1.2}
              aria-hidden="true"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
