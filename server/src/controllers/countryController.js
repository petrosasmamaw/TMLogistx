import { v4 as uuidv4 } from 'uuid';
import { getStore } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { cascadeCloseCountry } from '../utils/cascadeClose.js';

export async function getCountries(req, res, next) {
  try {
    const store = getStore();
    // System Admin sees all; other roles see active countries
    const countries = req.user.role === 'SYSTEM_ADMIN' 
      ? store.countries 
      : store.countries.filter(c => c.is_active);

    res.json({ success: true, count: countries.length, data: countries });
  } catch (err) {
    next(err);
  }
}

export async function createCountry(req, res, next) {
  try {
    const { name, code, currency = 'ETB' } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Country name and ISO code are required' });
    }

    const store = getStore();
    if (store.countries.some(c => c.code.toUpperCase() === code.toUpperCase() || c.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'A country with this name or code already exists' });
    }

    const newCountry = {
      id: 'cnt-' + code.toLowerCase() + '-' + uuidv4().substring(0, 4),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      currency: currency.trim().toUpperCase(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    store.countries.push(newCountry);

    await logAudit({
      userId: req.user.userId,
      action: 'COUNTRY_CREATED',
      entityType: 'COUNTRY',
      entityId: newCountry.id,
      newValues: newCountry,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({ success: true, message: 'Country created successfully', data: newCountry });
  } catch (err) {
    next(err);
  }
}

export async function updateCountry(req, res, next) {
  try {
    const { id } = req.params;
    const { name, currency, is_active } = req.body;

    const store = getStore();
    const country = store.countries.find(c => c.id === id);

    if (!country) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }

    const oldValues = { ...country };

    if (name !== undefined) country.name = name.trim();
    if (currency !== undefined) country.currency = currency.trim().toUpperCase();
    if (is_active !== undefined) {
      if (is_active === false) {
        cascadeCloseCountry(store, country.id);
      } else {
        country.is_active = true;
      }
    }
    country.updated_at = new Date();

    await logAudit({
      userId: req.user.userId,
      action: 'COUNTRY_UPDATED',
      entityType: 'COUNTRY',
      entityId: country.id,
      oldValues,
      newValues: country,
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({ success: true, message: 'Country updated successfully', data: country });
  } catch (err) {
    next(err);
  }
}
