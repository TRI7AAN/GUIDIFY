import React from "react";

const LandingPage = () => {
  return (
    <div className="overflow-x-hidden">
      <div className="relative overflow-hidden">
        {/* Blobs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--lucid-lavender)] rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--emerald-neon)] rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="relative z-10 flex flex-col">

          <main className="flex-grow max-w-7xl mx-auto w-full px-4 md:px-8">
            {/* Hero Section */}
            <section className="text-center py-24 md:py-40 px-4">
              <h1 className="text-7xl md:text-11xl font-bold text-white leading-tight mb-4   ">
                GUIDIFY
              </h1>
              <h3 className="text-7xl md:text-7xl font-bold text-white leading-tight mb-4   ">
                One-Stop Personalized Career & Education Advisor
              </h3>
              <h5 className="text-5xl md:text-5xl font-bold text-white leading-tight mb-4">
                Career Guidance, <span className="text-[var(--emerald-neon)]">Reimagined.</span>
              </h5>
              <p className="text-xl md:text-2xl text-[var(--lucid-lavender)] max-w-3xl mx-auto mb-8">
                Step into the future of mentorship. We fuse AI precision with human ambition to forge your perfect career path.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a className="glow-button px-8 py-4 text-xl w-full sm:w-auto" href="/register">
                  Find My Path
                </a>
                <div className="flex items-center justify-center p-4 bg-gray-800/30 rounded-lg w-full sm:w-auto">
                  <div className="w-3 h-3 bg-[var(--emerald-neon)] rounded-full animate-ping mr-3"></div>
                  <span className="text-[var(--lucid-lavender)]">AI is personalizing your journey...</span>
                </div>
              </div>
            </section>
            {/* Features Section */}
            <section className="py-20 px-4 max-w-7xl mx-auto" id="features">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="glass-card p-8 hover:-translate-y-2">
                  <div className="feature-icon mb-6">
                    <svg fill="currentColor" height="32" viewBox="0 0 256 256" width="32" xmlns="http://www.w3.org/2000/svg">
                      <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Hyper-Personalization</h3>
                  <p className="text-[var(--lucid-lavender)]">AI-driven insights that adapt to your unique skills, passions, and evolving career aspirations.</p>
                </div>
                <div className="glass-card p-8 hover:-translate-y-2">
                  <div className="feature-icon mb-6">
                    <svg fill="currentColor" height="32" viewBox="0 0 256 256" width="32" xmlns="http://www.w3.org/2000/svg">
                      <path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,143.6V232a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,48,128a8,8,0,0,1,16,0,64,64,0,0,0,128,0,8,8,0,0,1,16,0A80.11,80.11,0,0,1,136,207.6Z"></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">AI Mock Interviews</h3>
                  <p className="text-[var(--lucid-lavender)]">Hone your skills with intelligent AI interviewers that provide instant, actionable feedback.</p>
                </div>
                <div className="glass-card p-8 hover:-translate-y-2">
                  <div className="feature-icon mb-6">
                    <svg fill="currentColor" height="32" viewBox="0 0 256 256" width="32" xmlns="http://www.w3.org/2000/svg">
                      <path d="M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16ZM241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65ZM172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z"></path>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Gamified Learning</h3>
                  <p className="text-[var(--lucid-lavender)]">Level up your career knowledge through engaging challenges, quests, and rewards.</p>
                </div>
              </div>
            </section>
            {/* Testimonials Section */}
            <section className="py-20 px-4" id="testimonials">
              <h2 className="text-4xl font-bold text-center text-white mb-12">Success Stories from the Future</h2>
              <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                <div className="glass-card p-8 flex flex-col items-center text-center">
                  <img alt="User testimonial photo" className="w-24 h-24 rounded-full mb-4 border-2 border-[var(--emerald-neon)] shadow-lg" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC75WJyVKjjAWHKfVr6g_9r8WK0lpxYpWHbYAijMbZahF6qg0s9lovBu6i202E7bUoq69xglxpOtyR-Wrez8i-WKsVsE2AnOCF40zP09sjzr3Iuw-uRlK5MT3BJ8g1X4x2EZWS2fIV-0nT8fNh1YWmZLXjXTNSOcoibPDj3v8a8HDZsE5a6DWDxWdesACrNXEdEW1WDGqQwO8erSujay1fL9_2alFEeqepoxzjJ_lqScaIy6OAxa4jl5UMSYOHHCGhwXPu7yO1upw" />
                  <p className="text-[var(--lucid-lavender)] italic mb-4">"GUIDIFY helped me discover career paths I never knew existed. The personalized guidance was spot on!"</p>
                  <p className="font-bold text-white">Sarah Chen</p>
                  <p className="text-sm text-[var(--emerald-neon)]">University Student</p>
                </div>
                <div className="glass-card p-8 flex flex-col items-center text-center md:scale-110 md:z-10 bg-opacity-20">
                  <img alt="User testimonial photo" className="w-24 h-24 rounded-full mb-4 border-2 border-[var(--emerald-neon)] shadow-lg" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCphtohe0FkpKWNMIeIH5rd7ibpPrujoXlWenYFfBIW4OcV7VaerwndAkGQyF31ZQIsKSfS5tq9ImHax3cU76kleHGK6wRvLI0eW9QkV3vZb0DONHDATdWS43MIi3iZF7WVzvvZE7AEYXOhvaEzVTH7swAmXkP9lDCIdULVFBPF5Ep1ms_3X0eaQuJPMQpwATehCZF2Eja8QGT9nt9O9hqKKB_izBZ4LDZdzw0Ua9ii9GGibibUXYCTeS1nPFVAJSz4NOROXHtIWQ" />
                  <p className="text-[var(--lucid-lavender)] italic mb-4">"The mock interviews were a game-changer. I felt so much more confident going into my actual interviews."</p>
                  <p className="font-bold text-white">Mark Rodriguez</p>
                  <p className="text-sm text-[var(--emerald-neon)]">Recent Graduate</p>
                </div>
                <div className="glass-card p-8 flex flex-col items-center text-center">
                  <img alt="User testimonial photo" className="w-24 h-24 rounded-full mb-4 border-2 border-[var(--emerald-neon)] shadow-lg" src="https://lh3.googleusercontent.com/aida-public/AB6AXuATeOUaaus7vU7majDdmS_fnHT5Se1RtdBH5iTooeYft4k6NwapOCNBauGQTorRhyyuqFDuVsDxHBIW47YqGHPYlz8R1lzC8ZP0Sacof0ApMn7TyFTjq1ONOW0r_ZvR7lAHKVuBkNv4WJg8gc5oqgPESByPlnB2Qer_d5o9YWU6donruaMrGZhy9PLkiIys5UYz9x3l16qmjyx2Ijrvi1sGCk7RvUSS7jWasqdcZ-ASjGoUNaznQTm8dPGIDbcVjemd3vI_x8u-vg" />
                  <p className="text-[var(--lucid-lavender)] italic mb-4">"I love the gamified learning approach. It made exploring different careers fun and engaging!"</p>
                  <p className="font-bold text-white">Emily Nguyen</p>
                  <p className="text-sm text-[var(--emerald-neon)]">Career Changer</p>
                </div>
              </div>
            </section>
          </main>
          {/* Footer */}
          <footer className="w-full mt-20" id="footer">
            <div className="max-w-7xl mx-auto glass-card p-8 md:p-12 mb-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-center md:text-left" id="contact" >
                  <h3 className="text-3xl font-bold text-white">Ready to Find Your Path?</h3>
                  <p className="text-[var(--lucid-lavender)] mt-2">Join the next generation of ambitious leaders.</p>
                </div>
                <form className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
                  <input className="w-full sm:w-80 bg-white/10 border-2 border-[var(--lucid-lavender)] rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-[var(--emerald-neon)] focus:border-[var(--emerald-neon)] transition-all duration-300" placeholder="Enter your email" type="email" />
                  <button className="glow-button px-6 py-3 text-lg w-full sm:w-auto" type="submit">Subscribe</button>
                </form>
              </div>
              <hr className="border-[var(--glass-border)] my-8" />
              <div className="flex flex-col md:flex-row items-center justify-between text-[var(--lucid-lavender)]">
                <p className="text-sm mb-4 md:mb-0">© 2025 GUIDIFY. All rights reserved.</p>
                <div className="flex items-center gap-6">
                  <a className="hover:text-[var(--emerald-neon)] transition-colors" href="#">Contact</a>
                  <a className="hover:text-[var(--emerald-neon)] transition-colors" href="#">Privacy</a>
                  <a className="hover:text-[var(--emerald-neon)] transition-colors" href="#">Terms</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
