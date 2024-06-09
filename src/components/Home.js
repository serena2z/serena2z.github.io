import React from 'react';
import { Link } from 'react-router-dom';
import profilePic from '../been.jpg';
import '../styles/home.css';
import Header from './Header';

function Home() {
  return (
    <div className="main-content">
      <div className="left-panel">
        <img src={profilePic} alt="Profile" />
        <Header />
      </div>
      <div className="right-panel">
        <h1>Hi, I'm Serena!</h1>
        <p>It's crazy to find you here & welcome to this tiny corner of the digital universe. </p>
        <p>I'm a coterm student at Stanford studying computer science (BS, MS) while aspiring to be a doctor. As a result I'm trying to learn  
          and do impactful work in the intersection of biology and computer science. </p>
        <h1>Selected Writings</h1>
        <h1>Research</h1>
        <p>I'm currently working on radiology report generation at the Rajpurkar Lab @ Harvard. I've also worked on biases in skin classification
         at the Gevaert Lab @ Stanford.
        </p>
        <div className="contact-info">
          Reach out anytime at serena2z at stanford dot edu.
          <div className="social-icons">
            <a href="#"><i className="fab fa-linkedin"></i></a>
            <a href="#"><i className="fab fa-github"></i></a>
            <a href="#"><i className="fab fa-twitter"></i></a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
