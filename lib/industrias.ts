export const INDUSTRIAS = [
  // Alimentación
  'Restaurante',
  'Cafetería / Coffee shop',
  'Panadería / Pastelería',
  'Bar / Licorería',
  'Comida rápida',
  'Catering / Eventos',
  'Tienda de productos naturales',
  // Moda y accesorios
  'Ropa y calzado',
  'Joyería y accesorios',
  'Bolsos y marroquinería',
  'Ropa deportiva',
  'Ropa infantil',
  // Belleza y cuidado personal
  'Peluquería / Barbería',
  'Spa / Centro de estética',
  'Nail art / Manicure',
  'Cosméticos y maquillaje',
  'Productos capilares',
  // Salud y bienestar
  'Gimnasio / Fitness',
  'Yoga / Pilates',
  'Nutrición y suplementos',
  'Fisioterapia',
  'Medicina alternativa',
  // Hogar y construcción
  'Ferretería',
  'Materiales de construcción',
  'Muebles y decoración',
  'Artículos para el hogar',
  'Iluminación',
  // Tecnología
  'Venta de dispositivos',
  'Reparación de equipos',
  'Accesorios tecnológicos',
  'Servicios de impresión',
  // Arte y entretenimiento
  'Arte y manualidades',
  'Fotografía',
  'Música / Instrumentos',
  'Juguetería',
  'Librería / Papelería',
  // Servicios profesionales
  'Consultoría',
  'Diseño gráfico / Publicidad',
  'Educación / Clases',
  'Servicios de limpieza',
  'Mensajería / Logística',
  // Mascotas
  'Veterinaria',
  'Accesorios para mascotas',
  'Peluquería canina',
  // Otros
  'Tienda de regalos',
  'Floristeria',
  'Supermercado / Minimercado',
  'Farmacia / Droguería',
  'Óptica',
  'Otro',
] as const

export type Industria = typeof INDUSTRIAS[number]
