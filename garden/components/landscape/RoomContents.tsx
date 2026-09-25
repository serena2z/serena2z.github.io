'use client';
import Image from 'next/image';
import { Empty, EmptyDescription } from '@/components/ui/empty';
import { personalContent } from '@/lib/personal-content';
import type { Room } from '@/lib/landscape-config';

function EmptyNote({ children }: { children: string }) {
  return (
    <Empty className="note-empty">
      <EmptyDescription>{children}</EmptyDescription>
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
      <div className="note-body">
        <p>I’m an engineer at Phylo.</p>
        <section className="note-section">
          <h3>Projects</h3>
          <article className="note-entry">
            <h4>This website</h4>
            <p>
              An interactive landscape for the things I make, the ideas I
              follow, and the moments I want to keep. Built with Three.js.
            </p>
          </article>
          {personalContent.projects.map((project) => (
            <article className="note-entry" key={project.url}>
              <h4>
                <a href={project.url} target="_blank" rel="noreferrer">
                  {project.title}
                </a>
              </h4>
              <p>{project.description}</p>
            </article>
          ))}
        </section>
      </div>
    );
  if (room.id === 'writing')
    return (
      <div className="note-body">
        {personalContent.essays.length ? (
          personalContent.essays.map((essay) => (
            <article className="note-entry" key={essay.id}>
              <h3>{essay.title}</h3>
              <p className="note-meta">{essay.date}</p>
              {essay.body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </article>
          ))
        ) : (
          <EmptyNote>No essays here yet.</EmptyNote>
        )}
      </div>
    );
  if (room.id === 'research')
    return (
      <div className="note-body">
        {personalContent.papers.length ? (
          personalContent.papers.map((paper) => (
            <article className="note-entry" key={paper.id}>
              <h3>
                <a href={paper.url} target="_blank" rel="noreferrer">
                  {paper.title}
                </a>
              </h3>
              <p className="note-meta">{paper.authors}</p>
              <p>{paper.note}</p>
              {paper.contribution && (
                <p>
                  <strong>My contribution:</strong> {paper.contribution}
                </p>
              )}
            </article>
          ))
        ) : (
          <EmptyNote>No papers or reading notes here yet.</EmptyNote>
        )}
      </div>
    );
  if (room.id === 'creative')
    return (
      <div className="note-body">
        {!!personalContent.photos.length && (
          <section className="note-section">
            <h3>Photographs</h3>
            {personalContent.photos.map((photo) => (
              <figure className="note-media" key={photo.id}>
                <button
                  className="note-photo"
                  onClick={() => onPhoto(photo.id)}
                  aria-label={`View ${photo.title} full size`}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    unoptimized
                    loading="lazy"
                  />
                </button>
                <figcaption>
                  {photo.title}
                  {(photo.location || photo.year) && (
                    <span className="note-meta">
                      {[photo.location, photo.year].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </section>
        )}
        {!!personalContent.creative.length && (
          <section className="note-section">
            <h3>Drawings & films</h3>
            {personalContent.creative.map((item) => (
              <figure className="note-media" key={item.id}>
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
                  {item.title}
                  <span className="note-meta">{item.medium}</span>
                </figcaption>
              </figure>
            ))}
          </section>
        )}
        {!personalContent.photos.length && !personalContent.creative.length && (
          <EmptyNote>No photographs, drawings, or films here yet.</EmptyNote>
        )}
      </div>
    );
  return (
    <div className="note-body">
      {personalContent.shared.length ? (
        personalContent.shared.map((item) => (
          <article className="note-entry" key={item.id}>
            <h3>
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            </h3>
            <p className="note-meta">{item.creator}</p>
            <p>{item.note}</p>
          </article>
        ))
      ) : (
        <EmptyNote>No shared links here yet.</EmptyNote>
      )}
    </div>
  );
}
