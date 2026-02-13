// Scroll suave para âncoras
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) {
    navbar.style.boxShadow = '0 5px 20px rgba(0,0,0,0.1)';
  } else {
    navbar.style.boxShadow = 'none';
  }
});

// Contador de números animados
function animateCounters() {
  const counters = document.querySelectorAll('[data-target]');
  
  counters.forEach(counter => {
    const target = parseInt(counter.getAttribute('data-target'));
    const duration = 2000; // 2 segundos
    const increment = target / (duration / 50);
    let current = 0;

    const updateCounter = () => {
      current += increment;
      if (current < target) {
        counter.textContent = Math.floor(current);
        setTimeout(updateCounter, 50);
      } else {
        counter.textContent = target;
      }
    };

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !counter.hasStarted) {
        counter.hasStarted = true;
        updateCounter();
      }
    });
    observer.observe(counter);
  });
}

setTimeout(animateCounters, 100);

// Fade-in e slide-up para elementos
const observerElements = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.card, .feature-item, .step, .use-case, .testimonial, .pricing-card, .faq-item').forEach(el => {
  el.style.opacity = '0';
  observerElements.observe(el);
});

// Adicionar animação keyframes dinamicamente
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;
document.head.appendChild(style);

// Tech gradient text animation
const handleGradientAnimation = () => {
  const elements = document.querySelectorAll('[style*="background-clip"]');
  elements.forEach(el => {
    el.addEventListener('mouseenter', function() {
      this.style.filter = 'brightness(1.2)';
    });
    el.addEventListener('mouseleave', function() {
      this.style.filter = 'brightness(1)';
    });
  });
};

setTimeout(handleGradientAnimation, 100);

// Validação de email simples
const emailInputs = document.querySelectorAll('input[type="email"]');
emailInputs.forEach(input => {
  input.addEventListener('blur', function() {
    const email = this.value;
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (email && !isValid) {
      this.style.borderColor = '#ff6b6b';
    } else {
      this.style.borderColor = 'var(--border)';
    }
  });
});

// Log de engajamento (analytics simples)
window.addEventListener('load', () => {
  console.log('📊 Auralis landing page loaded successfully!');
  console.log('🎙️ Transformando áudio em texto inteligente...');
});
