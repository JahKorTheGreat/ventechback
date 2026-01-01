// Artillery processor for dynamic test data
// This file is optional but useful for more complex scenarios

module.exports = {
  // Generate random product IDs or slugs if needed
  generateProductSlug: () => {
    // This would typically fetch from your database
    // For now, return a placeholder
    return 'sample-product-slug';
  },
  
  // Generate random search terms
  generateSearchTerm: () => {
    const terms = ['laptop', 'phone', 'tablet', 'gadget', 'accessory'];
    return terms[Math.floor(Math.random() * terms.length)];
  }
};

