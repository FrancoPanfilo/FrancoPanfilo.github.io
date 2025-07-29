// Script de depuración para el modal
document.addEventListener('DOMContentLoaded', function() {
  console.log('Script de depuración cargado');
  
  // Verificar si el modal existe
  const modal = document.getElementById('torneo-modal');
  if (modal) {
    console.log('Modal encontrado:', modal);
    
    // Verificar los estilos computados del modal
    const computedStyle = window.getComputedStyle(modal);
    console.log('Estilos computados del modal:', {
      display: computedStyle.display,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      backgroundColor: computedStyle.backgroundColor
    });
    
    // Verificar si hay algún elemento que pueda estar ocultando el modal
    const elementsAboveModal = [];
    document.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      const zIndex = parseInt(style.zIndex, 10);
      if (!isNaN(zIndex) && zIndex > parseInt(computedStyle.zIndex, 10)) {
        elementsAboveModal.push({
          element: el.tagName,
          id: el.id,
          class: el.className,
          zIndex: zIndex
        });
      }
    });
    console.log('Elementos con z-index mayor que el modal:', elementsAboveModal);
    
    // Forzar la visualización del modal
    console.log('Forzando la visualización del modal...');
    modal.style.cssText = `
      display: block !important;
      z-index: 999999 !important;
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: auto !important;
      background-color: rgba(0, 0, 0, 0.95) !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;
    
    // Verificar el contenido del modal
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      console.log('Contenido del modal encontrado:', modalContent);
      modalContent.style.cssText = `
        background-color: white !important;
        margin: 5% auto !important;
        width: 90% !important;
        max-width: 1000px !important;
        border-radius: 8px !important;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.9) !important;
        border: 3px solid rgba(255, 255, 255, 0.2) !important;
        visibility: visible !important;
        opacity: 1 !important;
        display: block !important;
      `;
    } else {
      console.error('Contenido del modal no encontrado');
    }
    
    // Verificar si hay algún error en la consola
    if (console.error.toString().indexOf('native code') >= 0) {
      const originalError = console.error;
      console.error = function() {
        console.log('ERROR DETECTADO:', arguments);
        originalError.apply(console, arguments);
      };
    }
  } else {
    console.error('Modal no encontrado en el DOM');
    
    // Crear un modal de emergencia
    const emergencyModal = document.createElement('div');
    emergencyModal.id = 'emergency-modal';
    emergencyModal.style.cssText = `
      display: block !important;
      z-index: 999999 !important;
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: auto !important;
      background-color: rgba(0, 0, 0, 0.95) !important;
    `;
    
    const emergencyContent = document.createElement('div');
    emergencyContent.style.cssText = `
      background-color: white !important;
      margin: 5% auto !important;
      width: 90% !important;
      max-width: 800px !important;
      border-radius: 8px !important;
      box-shadow: 0 5px 25px rgba(0, 0, 0, 0.9) !important;
      border: 3px solid red !important;
      padding: 20px !important;
      text-align: center !important;
    `;
    
    const emergencyTitle = document.createElement('h2');
    emergencyTitle.textContent = 'MODAL DE EMERGENCIA';
    emergencyTitle.style.color = 'red';
    
    const emergencyMessage = document.createElement('p');
    emergencyMessage.textContent = 'El modal original no se encontró en el DOM. Este es un modal de emergencia.';
    
    const emergencyClose = document.createElement('button');
    emergencyClose.textContent = 'Cerrar';
    emergencyClose.style.cssText = `
      background-color: red !important;
      color: white !important;
      padding: 10px 20px !important;
      border: none !important;
      border-radius: 5px !important;
      cursor: pointer !important;
      margin-top: 20px !important;
    `;
    emergencyClose.addEventListener('click', function() {
      document.body.removeChild(emergencyModal);
    });
    
    emergencyContent.appendChild(emergencyTitle);
    emergencyContent.appendChild(emergencyMessage);
    emergencyContent.appendChild(emergencyClose);
    emergencyModal.appendChild(emergencyContent);
    
    document.body.appendChild(emergencyModal);
  }
});