import React from 'react';
import '../styles/writing.css';
import Header from './Header';

function Writing() {
  return (
    <div className="main-content">
        <div className="left-panel-writing">
            <Header />
        </div>
        <div className="right-panel-writing">
            <h1>All Writings</h1>
        </div>
    </div>
  );
}

export default Writing;
