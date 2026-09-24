const Validation = (function () {

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateField(name, value, formValues) {
    switch (name) {
      case 'fullName':
        if (!value || !value.trim()) return 'Full name is required.';
        if (value.trim().length < 2) return 'Enter your full name.';
        return null;

      case 'email':
        if (!value || !value.trim()) return 'Email address is required.';
        if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address.';
        return null;

      case 'contact':
        if (!value || !value.trim()) return 'Contact number is required.';
        if (value.replace(/[^0-9]/g, '').length < 7) return 'Enter a valid contact number.';
        return null;

      case 'package':
        if (!value) return 'Select a photography package.';
        return null;

      case 'customRequest':
        // Only required when the customer picked "Other / Custom Request".
        if (formValues && formValues.package === 'Other / Custom Request') {
          if (!value || !value.trim()) return 'Please describe your custom request.';
        }
        return null;

      case 'date': {
        if (!value) return 'Session date is required.';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const picked = new Date(value + 'T00:00:00');
        if (picked < today) return 'Session date cannot be in the past.';
        return null;
      }

      case 'time':
        if (!value) return 'Session time is required.';
        return null;

      case 'location':
        if (!value || !value.trim()) return 'Shoot location is required.';
        return null;

      case 'participants': {
        if (value === '' || value === null || value === undefined) return 'Number of participants is required.';
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1) return 'Enter a valid number of participants (1 or more).';
        return null;
      }

      default:
        return null;
    }
  }

  function validateAll(values) {
    const errors = {};
    Object.keys(values).forEach(function (key) {
      const err = validateField(key, values[key], values);
      if (err) errors[key] = err;
    });
    return errors;
  }

  return { validateField, validateAll, EMAIL_RE };
})();