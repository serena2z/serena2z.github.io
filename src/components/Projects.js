import React from 'react';
import Header from './Header';
import '../styles/projects.css';


function Projects() {
  return (
    <div className="main-content">
      <div className="left-panel-projects">
          <Header />
      </div>
      <div className="right-panel-projects">
          <h1>All Projects</h1>
      </div>
    </div>
  );
}

export default Projects;
