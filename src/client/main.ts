interface Coordinates {
  lat: number;
  lon: number;
  accuracy?: number;
}
interface Preferences {
  language: string;
  units: 'metric';
  interests: string[];
  newsTopics: string[];
  accessibilityMode: boolean;
  avatarEnabled: boolean;
}
const defaultCoordinates: Coordinates = { lat: 41.9028, lon: 12.4964 };
const defaultPreferences: Preferences = {
  language: 'it',
  units: 'metric',
  interests: ['viaggi', 'storia', 'cultura'],
  newsTopics: ['mobilità', 'territorio'],
  accessibilityMode: false,
  avatarEnabled: true,
};
let coordinates = loadJson<Coordinates>('lia.coordinates', defaultCoordinates);
let preferences = loadJson<Preferences>('lia.preferences', defaultPreferences);

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error('Missing element: ' + id);
  return element as T;
}
function loadJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
}
function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ??
      character,
  );
}
function safeUrl(value: unknown): string {
  try {
    const url = new URL(String(value));
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '#';
  } catch {
    return '#';
  }
}
function showToast(message: string): void {
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.remove('translate-y-6', 'opacity-0');
  window.setTimeout(() => toast.classList.add('translate-y-6', 'opacity-0'), 2800);
}
function setSync(label: string, active = true): void {
  const target = byId('syncStatus');
  target.innerHTML =
    '<span class="h-2 w-2 rounded-full ' +
    (active ? 'bg-lime' : 'bg-amber') +
    '"></span>' +
    escapeHtml(label);
}
function sourceLabel(envelope: any): string {
  return [envelope?.source ?? 'non disponibile', envelope?.quality ?? '']
    .filter(Boolean)
    .join(' · ');
}
function trafficWidth(level: string): string {
  return (
    ({ low: '22%', moderate: '48%', high: '76%', severe: '100%' } as Record<string, string>)[
      level
    ] ?? '0%'
  );
}
function trafficLabel(level: string): string {
  return (
    (
      { low: 'Scorrevole', moderate: 'Rallentato', high: 'Intenso', severe: 'Critico' } as Record<
        string,
        string
      >
    )[level] ?? 'Non disponibile'
  );
}

async function api<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(pathname, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message ?? 'Richiesta non riuscita');
  return payload as T;
}
function renderDashboard(data: any): void {
  const placeName = data.place?.data?.displayName ?? 'Posizione corrente';
  byId('locationName').textContent = placeName;
  byId('latitudeValue').textContent = Number(data.coordinates.lat).toFixed(4);
  byId('longitudeValue').textContent = Number(data.coordinates.lon).toFixed(4);
  byId('lastUpdate').textContent =
    'Aggiornato ' +
    new Intl.DateTimeFormat('it', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(
      new Date(data.generatedAt),
    );
  const traffic = data.traffic?.data ?? {};
  byId('trafficLevel').textContent = trafficLabel(traffic.congestionLevel);
  byId('trafficRoad').textContent = traffic.roadName ?? 'Area corrente';
  byId('trafficSpeed').textContent =
    traffic.currentSpeedKmh == null ? '—' : Math.round(traffic.currentSpeedKmh).toString();
  byId('trafficSource').textContent = sourceLabel(data.traffic);
  (byId('trafficBar') as HTMLElement).style.width = trafficWidth(traffic.congestionLevel);
  const weather = data.weather?.data ?? {};
  byId('temperature').textContent =
    weather.temperatureC == null ? '—' : Math.round(weather.temperatureC) + '°';
  byId('weatherDescription').textContent = weather.description ?? 'Non disponibile';
  byId('windSpeed').textContent =
    weather.windSpeedKmh == null ? '—' : Math.round(weather.windSpeedKmh) + ' km/h';
  byId('humidity').textContent =
    weather.humidityPercent == null ? '—' : Math.round(weather.humidityPercent) + '%';
  byId('weatherSource').textContent = sourceLabel(data.weather);
  const news = data.news?.data ?? [];
  byId('newsCount').textContent = String(news.length);
  byId('newsList').innerHTML = news.length
    ? news
        .map(
          (item: any) =>
            '<a class="list-link grid gap-1" href="' +
            safeUrl(item.link) +
            '" target="_blank" rel="noreferrer"><span class="text-sm font-medium leading-6">' +
            escapeHtml(item.title) +
            '</span><span class="text-xs text-mist">' +
            escapeHtml(item.publisher) +
            ' · ' +
            new Intl.DateTimeFormat('it', { hour: '2-digit', minute: '2-digit' }).format(
              new Date(item.publishedAt),
            ) +
            '</span></a>',
        )
        .join('')
    : '<p class="text-sm text-mist">Nessuna notizia recente trovata per l area.</p>';
  const places = data.places?.data ?? [];
  byId('placesList').innerHTML = places.length
    ? places
        .map(
          (item: any) =>
            '<div class="rounded-2xl border border-white/10 p-3"><strong class="text-sm">' +
            escapeHtml(item.displayName) +
            '</strong><p class="mt-1 text-xs capitalize text-mist">' +
            escapeHtml(item.category.replaceAll('_', ' ')) +
            '</p></div>',
        )
        .join('')
    : '<p class="text-sm text-mist">Nessun luogo indicizzato nelle vicinanze.</p>';
  const history = data.history?.data ?? [];
  byId('historyList').innerHTML = history.length
    ? history
        .map(
          (item: any) =>
            '<a class="list-link" href="' +
            safeUrl(item.url) +
            '" target="_blank" rel="noreferrer"><strong class="text-sm">' +
            escapeHtml(item.title) +
            '</strong><p class="mt-1 line-clamp-3 text-xs leading-5 text-mist">' +
            escapeHtml(item.summary) +
            '</p></a>',
        )
        .join('')
    : '<p class="text-sm text-mist">Nessuna voce storica geolocalizzata.</p>';
  const avatarUrl = data.avatar?.embedUrl;
  if (avatarUrl && byId<HTMLIFrameElement>('avatarFrame').src !== avatarUrl)
    byId<HTMLIFrameElement>('avatarFrame').src = avatarUrl;
  renderServices(data);
  renderLogs(data.recentLogs ?? []);
}
function renderServices(data: any): void {
  const serviceNames = ['traffic', 'weather', 'news', 'places', 'history', 'avatar'];
  const persisted = new Map((data.serviceStatus ?? []).map((item: any) => [item.service, item]));
  byId('servicesList').innerHTML = serviceNames
    .map((name) => {
      const envelope = data[name];
      const status: any = persisted.get(name);
      const operational = status?.status
        ? status.status === 'operational'
        : Boolean(envelope?.data || (name === 'avatar' && data.avatar?.configured));
      const detail =
        status?.latency_ms != null
          ? status.latency_ms + ' ms'
          : name === 'avatar'
            ? data.avatar?.configured
              ? 'embed configurato'
              : 'configurazione richiesta'
            : sourceLabel(envelope);
      return (
        '<div class="service-row"><div><strong class="block text-sm capitalize">' +
        escapeHtml(name) +
        '</strong><span class="text-xs text-mist">' +
        escapeHtml(detail) +
        '</span></div><span class="h-2.5 w-2.5 rounded-full ' +
        (operational ? 'bg-lime' : 'bg-amber') +
        '"></span></div>'
      );
    })
    .join('');
}
function renderLogs(logs: any[]): void {
  byId('logsList').innerHTML = logs.length
    ? logs
        .map(
          (entry) =>
            '<div class="flex gap-3 rounded-xl bg-black/20 p-2"><span class="text-cyan">' +
            escapeHtml(entry.level) +
            '</span><span>' +
            escapeHtml(entry.service) +
            '</span><span class="truncate text-white/70">' +
            escapeHtml(entry.message) +
            '</span></div>',
        )
        .join('')
    : '<p>Nessun evento persistito. Collega Supabase per lo storico centralizzato.</p>';
}
async function refresh(force = false): Promise<void> {
  setSync('sincronizzazione', false);
  byId<HTMLButtonElement>('refreshButton').disabled = true;
  try {
    const query = new URLSearchParams({
      lat: String(coordinates.lat),
      lon: String(coordinates.lon),
      ...(force ? { force: 'true' } : {}),
    });
    const data = await api<any>('/api/dashboard?' + query);
    renderDashboard(data);
    setSync('aggiornato');
  } catch (error) {
    setSync('errore dati', false);
    showToast(error instanceof Error ? error.message : 'Errore di aggiornamento');
  } finally {
    byId<HTMLButtonElement>('refreshButton').disabled = false;
  }
}
async function locate(): Promise<void> {
  if (!navigator.geolocation) {
    showToast('Geolocalizzazione non supportata');
    return;
  }
  setSync('ricerca GPS', false);
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      coordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
      localStorage.setItem('lia.coordinates', JSON.stringify(coordinates));
      byId('gpsAccuracy').textContent = '±' + Math.round(position.coords.accuracy) + ' m';
      byId('gpsMessage').textContent =
        'Posizione acquisita dal dispositivo e usata per il contesto.';
      byId('gpsState').textContent = 'GPS attivo';
      byId('gpsDot').className = 'h-2 w-2 rounded-full bg-lime';
      void api('/api/gps', {
        method: 'POST',
        body: JSON.stringify({
          lat: coordinates.lat,
          lon: coordinates.lon,
          accuracyMeters: position.coords.accuracy,
          altitudeMeters: position.coords.altitude ?? undefined,
          headingDegrees: position.coords.heading ?? undefined,
          speedMps: position.coords.speed ?? undefined,
        }),
      }).catch(() => undefined);
      await refresh(true);
    },
    (error) => {
      setSync('GPS non disponibile', false);
      showToast(error.message);
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  );
}
async function askLia(message: string): Promise<void> {
  const messages = byId('chatMessages');
  messages.insertAdjacentHTML('beforeend', '<p class="chat-user">' + escapeHtml(message) + '</p>');
  messages.scrollTop = messages.scrollHeight;
  try {
    const result = await api<any>('/api/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        location: coordinates,
        preferences,
        stream: false,
      }),
    });
    const answer = result.choices?.[0]?.message?.content ?? 'Nessuna risposta disponibile.';
    messages.insertAdjacentHTML(
      'beforeend',
      '<p class="chat-assistant">' + escapeHtml(answer) + '</p>',
    );
  } catch (error) {
    messages.insertAdjacentHTML(
      'beforeend',
      '<p class="chat-assistant text-amber">' +
        escapeHtml(error instanceof Error ? error.message : 'OpenAI non configurato') +
        '</p>',
    );
  }
  messages.scrollTop = messages.scrollHeight;
}
function openPreferences(): void {
  byId<HTMLInputElement>('newsTopicsInput').value = preferences.newsTopics.join(', ');
  byId<HTMLInputElement>('interestsInput').value = preferences.interests.join(', ');
  byId<HTMLInputElement>('accessibilityInput').checked = preferences.accessibilityMode;
  byId<HTMLDialogElement>('preferencesDialog').showModal();
}
function savePreferences(): void {
  preferences = {
    ...preferences,
    newsTopics: byId<HTMLInputElement>('newsTopicsInput')
      .value.split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    interests: byId<HTMLInputElement>('interestsInput')
      .value.split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    accessibilityMode: byId<HTMLInputElement>('accessibilityInput').checked,
  };
  localStorage.setItem('lia.preferences', JSON.stringify(preferences));
  document.body.classList.toggle('accessible', preferences.accessibilityMode);
  void api('/api/preferences', { method: 'PUT', body: JSON.stringify(preferences) }).catch(
    () => undefined,
  );
  showToast('Preferenze salvate sul dispositivo');
  void refresh(true);
}
function initialize(): void {
  document.body.classList.toggle('accessible', preferences.accessibilityMode);
  byId('latitudeValue').textContent = coordinates.lat.toFixed(4);
  byId('longitudeValue').textContent = coordinates.lon.toFixed(4);
  byId('locateButton').addEventListener('click', () => void locate());
  byId('refreshButton').addEventListener('click', () => void refresh(true));
  byId('preferencesButton').addEventListener('click', openPreferences);
  byId('savePreferencesButton').addEventListener('click', savePreferences);
  byId<HTMLFormElement>('chatForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = byId<HTMLInputElement>('chatInput');
    const value = input.value.trim();
    if (!value) return;
    input.value = '';
    void askLia(value);
  });
  void refresh();
  window.setInterval(() => void refresh(), 15 * 60 * 1000);
}
initialize();
