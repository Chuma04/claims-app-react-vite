// src/components/Layout/Layout.jsx
import React, { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const Layout = ({ children }) => {
    const [isSidebarMini, setIsSidebarMini] = useState(false);
    // State to manage overall layout classes potentially needed on a wrapper
    const [layoutClasses, setLayoutClasses] = useState("has-navbar-vertical-aside navbar-vertical-aside-show-xl footer-offset");

    const toggleSidebar = () => {
        setIsSidebarMini(!isSidebarMini);
        // Add/Remove body classes or wrapper classes based on template's JS logic
        // Example: If template toggled classes on body
        if (!isSidebarMini) {
            // document.body.classList.add('navbar-vertical-aside-mini-mode');
        } else {
            // document.body.classList.remove('navbar-vertical-aside-mini-mode');
        }
        // For now, we pass state to Sidebar, and it adds its own class.
        // More complex interactions might need adjustments here or using useEffect.
    };

    // Optional: Use useEffect to manage classes on the body or a wrapper div
    useEffect(() => {
        // Apply initial classes to body or a wrapper div if needed
        // Example for body:
        const bodyClasses = ['has-navbar-vertical-aside', 'navbar-vertical-aside-show-xl', 'footer-offset'];
        document.body.classList.add(...bodyClasses);

        // Optional: Add mini class based on state
        if(isSidebarMini) {
            document.body.classList.add('navbar-vertical-aside-mini-mode'); // Use the correct class from template inspection
        } else {
            document.body.classList.remove('navbar-vertical-aside-mini-mode');
        }


        // Cleanup function to remove classes when Layout unmounts
        return () => {
            document.body.classList.remove(...bodyClasses, 'navbar-vertical-aside-mini-mode');
        };
    }, [isSidebarMini]); // Re-run effect when isSidebarMini changes


    return (
        // The wrapper div might be needed if applying classes directly to body is problematic
        <div className={layoutClasses}>
        <>
            <Header onToggleSidebar={toggleSidebar} />
            <Sidebar isSidebarMini={isSidebarMini} />
            {/* ========== MAIN CONTENT ========== */}
            <main id="content" role="main" className="main">
                {children}
            </main>
            <Footer />
        </>
        </div>
    );
};

export default Layout;