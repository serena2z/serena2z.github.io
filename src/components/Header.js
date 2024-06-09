import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/header.css';

function Header() {
  return (
    <header>
      <nav className="side-nav">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/writing">Writings</Link></li>
          <li><Link to="/projects">Projects</Link></li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
