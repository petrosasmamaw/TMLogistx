import { v4 as uuidv4 } from 'uuid';
import { getStore, queueStoreSave } from '../db/connection.js';
import { logAudit } from '../middleware/audit.js';
import { cascadeCloseCountry } from '../utils/cascadeClose.js';
import { findWorldCountryByCode, searchWorldCountries } from '../data/worldCountries.js';
import { DEFAULT_DAY_SHIFT_START, DEFAULT_DAY_SHIFT_END } from '../constants/countryShiftDefaults.js';

export async function getCountryCatalog(req, res, next) {
  try {
    const { q, limit } = req.query;
    const max = Math.min(parseInt(limit, 10) || 30, 80);
    const data = searchWorldCountries(q, max);
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
}

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
    const {
      name,
      code,
      catalog_code,
      currency = 'ETB',
      timezone,
      day_shift_start = DEFAULT_DAY_SHIFT_START,
      day_shift_end = DEFAULT_DAY_SHIFT_END,
      weekend_days = [6, 0]
    } = req.body;

    const catalog = catalog_code ? findWorldCountryByCode(catalog_code) : null;
    const resolvedName = (name || catalog?.name || '').trim();
    const resolvedCode = (code || catalog?.code || catalog_code || '').trim().toUpperCase();
    const resolvedCurrency = (currency || catalog?.currency || 'USD').trim().toUpperCase();
    const resolvedTimezone = (timezone || catalog?.timezone || 'UTC').trim();

    if (!resolvedName || !resolvedCode) {
      return res.status(400).json({
        success: false,
        error: 'Select a country from the catalog (search) or provide name and ISO code'
      });
    }

    const store = getStore();
    if (
      store.countries.some(
        (c) =>
          c.code.toUpperCase() === resolvedCode ||
          c.name.toLowerCase() === resolvedName.toLowerCase()
      )
    ) {
      return res.status(400).json({ success: false, error: 'A country with this name or code already exists' });
    }

    const newCountry = {
      id: 'cnt-' + resolvedCode.toLowerCase() + '-' + uuidv4().substring(0, 4),
      name: resolvedName,
      code: resolvedCode,
      currency: resolvedCurrency,
      timezone: resolvedTimezone,
      day_shift_start: String(day_shift_start).slice(0, 5),
      day_shift_end: String(day_shift_end).slice(0, 5),
      weekend_days: Array.isArray(weekend_days) ? weekend_days.map((d) => parseInt(d, 10)) : [6, 0],
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    store.countries.push(newCountry);
    queueStoreSave();

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
    const { name, currency, is_active, timezone, day_shift_start, day_shift_end, weekend_days } = req.body;

    const store = getStore();
    const country = store.countries.find(c => c.id === id);

    if (!country) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }

    const oldValues = { ...country };

    if (name !== undefined) country.name = name.trim();
    if (currency !== undefined) country.currency = currency.trim().toUpperCase();
    if (timezone !== undefined) country.timezone = String(timezone).trim();
    if (day_shift_start !== undefined) country.day_shift_start = String(day_shift_start).slice(0, 5);
    if (day_shift_end !== undefined) country.day_shift_end = String(day_shift_end).slice(0, 5);
    if (weekend_days !== undefined && Array.isArray(weekend_days)) {
      country.weekend_days = weekend_days.map((d) => parseInt(d, 10));
    }
    if (is_active !== undefined) {
      if (is_active === false) {
        cascadeCloseCountry(store, country.id);
      } else {
        country.is_active = true;
      }
    }
    country.updated_at = new Date();
    queueStoreSave();

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
