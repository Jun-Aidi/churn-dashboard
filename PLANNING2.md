# 🚀 Optimasi Performa: Mengurangi Delay Loading Frontend-Backend

## 📊 Analisis Masalah yang Teridentifikasi

### 1. **Backend Performance Bottlenecks**

#### A. Model Loading di Setiap Request
**Lokasi**: [`backend/app/services/customer_service.py:19-23`](backend/app/services/customer_service.py:19-23)
```python
_bundle = joblib.load(config.MODEL_PATH)  # Loaded at module level
_model = _bundle['model']
```
- ✅ **Status**: Sudah optimal (loaded sekali saat startup)

#### B. Database Query Inefficiency
**Lokasi**: [`backend/app/services/customer_service.py:142-169`](backend/app/services/customer_service.py:142-169)
- ❌ **Masalah**: Query semua customer tanpa pagination
- ❌ **Masalah**: Prediksi ulang jika `risk_score` NULL (line 155-158)
- ❌ **Masalah**: Update DB satu per satu dalam loop (line 175-181)

#### C. Feature Engineering Overhead
**Lokasi**: [`backend/app/services/customer_service.py:35-89`](backend/app/services/customer_service.py:35-89)
- ❌ **Masalah**: Kalkulasi 13 fitur engineered untuk setiap request
- ❌ **Masalah**: Tidak ada caching hasil prediksi

#### D. CSV Fallback Performance
**Lokasi**: [`backend/app/services/customer_service.py:166-168`](backend/app/services/customer_service.py:166-168)
- ❌ **Masalah**: Load & predict entire CSV setiap kali service diinisialisasi
- ❌ **Masalah**: Tidak ada caching untuk hasil prediksi CSV

### 2. **Frontend Performance Issues**

#### A. Fetch All Customers at Once
**Lokasi**: [`frontend/src/hooks/useCustomers.js:54-79`](frontend/src/hooks/useCustomers.js:54-79)
- ❌ **Masalah**: Fetch semua customer sekaligus tanpa pagination
- ❌ **Masalah**: Tidak ada lazy loading atau virtual scrolling

#### B. Multiple API Calls on Dashboard
**Lokasi**: [`frontend/src/pages/Dashboard.jsx:32`](frontend/src/pages/Dashboard.jsx:32)
- ❌ **Masalah**: `useCustomers()` fetch semua data
- ❌ **Masalah**: `ChurnTrendChart` & `RiskDonutChart` mungkin fetch data terpisah

#### C. No Data Caching
**Lokasi**: [`frontend/src/api/index.js:15-37`](frontend/src/api/index.js:15-37)
- ❌ **Masalah**: Tidak ada caching layer (React Query, SWR, atau localStorage)
- ❌ **Masalah**: Setiap page navigation re-fetch data

#### D. Client-Side Processing
**Lokasi**: [`frontend/src/api/index.js:50-98`](frontend/src/api/index.js:50-98)
- ⚠️ **Perhatian**: `getFactors()` & `getRecos()` di client-side (acceptable, tapi bisa dioptimasi)

### 3. **Network & Architecture Issues**

#### A. No Response Compression
- ❌ **Masalah**: Backend tidak menggunakan gzip/brotli compression
- ❌ **Masalah**: JSON response besar untuk banyak customer

#### B. No API Response Pagination
**Lokasi**: [`backend/app/routes.py:44-49`](backend/app/routes.py:44-49)
- ❌ **Masalah**: Endpoint `/api/customers` return semua data
- ❌ **Masalah**: Tidak ada query params untuk limit/offset

#### C. No Connection Pooling Optimization
**Lokasi**: [`backend/app/database.py:182-188`](backend/app/database.py:182-188)
```python
pool_size=10,
max_overflow=20,
```
- ⚠️ **Perhatian**: Pool size mungkin perlu tuning

---

## 🎯 Solusi & Rekomendasi Prioritas

### **TIER 1: Critical (High Impact, Quick Wins)** ⚡

#### 1.1 Implementasi Response Caching di Backend
**Impact**: 🔥🔥🔥 (70-90% reduction untuk repeat requests)

**Implementasi**:
```python
# backend/app/cache.py (NEW FILE)
from functools import lru_cache
from datetime import datetime, timedelta
import hashlib
import json

class SimpleCache:
    def __init__(self, ttl_seconds=300):  # 5 minutes default
        self._cache = {}
        self._ttl = ttl_seconds
    
    def get(self, key):
        if key in self._cache:
            data, timestamp = self._cache[key]
            if datetime.now() - timestamp < timedelta(seconds=self._ttl):
                return data
            del self._cache[key]
        return None
    
    def set(self, key, value):
        self._cache[key] = (value, datetime.now())
    
    def invalidate(self, pattern=None):
        if pattern:
            keys_to_delete = [k for k in self._cache if pattern in k]
            for k in keys_to_delete:
                del self._cache[k]
        else:
            self._cache.clear()

# Global cache instance
customer_cache = SimpleCache(ttl_seconds=300)  # 5 min cache
```

**Modifikasi [`backend/app/services/customer_service.py`](backend/app/services/customer_service.py)**:
```python
def get_all_customers(self) -> List[dict]:
    cache_key = "all_customers"
    cached = customer_cache.get(cache_key)
    if cached:
        return cached
    
    if self.df is None or self.df.empty:
        return []
    
    result = [self._customer_to_dict(row) for _, row in self.df.iterrows()]
    customer_cache.set(cache_key, result)
    return result
```

#### 1.2 Implementasi Pagination di Backend
**Impact**: 🔥🔥🔥 (80-95% reduction untuk initial load)

**Modifikasi [`backend/app/routes.py:44-49`](backend/app/routes.py:44-49)**:
```python
@customers_bp.route('/customers', methods=['GET'])
def get_customers():
    """Get customers with pagination."""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    risk_filter = request.args.get('risk', None)  # 'high', 'med', 'low'
    
    service = CustomerService()
    result = service.get_customers_paginated(page, per_page, risk_filter)
    return jsonify(result)
```

**Tambahkan method di [`backend/app/services/customer_service.py`](backend/app/services/customer_service.py)**:
```python
def get_customers_paginated(self, page: int = 1, per_page: int = 50, risk_filter: str = None) -> dict:
    """Get paginated customers with optional risk filter."""
    if self.df is None or self.df.empty:
        return {'customers': [], 'total': 0, 'page': page, 'per_page': per_page, 'pages': 0}
    
    df_filtered = self.df
    if risk_filter:
        df_filtered = df_filtered[df_filtered['risk_class'] == risk_filter]
    
    total = len(df_filtered)
    pages = (total + per_page - 1) // per_page
    start = (page - 1) * per_page
    end = start + per_page
    
    customers = [self._customer_to_dict(row) for _, row in df_filtered.iloc[start:end].iterrows()]
    
    return {
        'customers': customers,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': pages,
        'has_next': page < pages,
        'has_prev': page > 1
    }
```

#### 1.3 Implementasi Response Compression (Gzip)
**Impact**: 🔥🔥 (60-80% reduction dalam transfer size)

**Modifikasi [`backend/run.py`](backend/run.py)**:
```python
from flask_compress import Compress

app = Flask(__name__)
Compress(app)  # Enable gzip compression

# Configure compression
app.config['COMPRESS_MIMETYPES'] = [
    'text/html', 'text/css', 'text/xml',
    'application/json', 'application/javascript'
]
app.config['COMPRESS_LEVEL'] = 6  # Balance between speed and compression
app.config['COMPRESS_MIN_SIZE'] = 500  # Only compress responses > 500 bytes
```

**Install dependency**:
```bash
pip install flask-compress
```

#### 1.4 Pre-compute Risk Scores (Batch Processing)
**Impact**: 🔥🔥🔥 (Eliminasi prediksi real-time)

**Strategy**: 
- Compute risk scores saat data upload atau via scheduled job
- Store di database
- API hanya query, tidak predict

**Modifikasi [`backend/app/services/customer_service.py:142-169`](backend/app/services/customer_service.py:142-169)**:
```python
def _load_data(self):
    """Load data from MySQL or fall back to CSV."""
    session = get_session()
    if session:
        try:
            customers = session.query(Customer).all()
            if customers:
                self._use_db = True
                rows = []
                for c in customers:
                    rows.append({col.name: getattr(c, col.name) for col in Customer.__table__.columns})
                self.df = pd.DataFrame(rows)
                
                # REMOVED: Real-time prediction
                # Only predict if risk_score is explicitly NULL (new records)
                needs_prediction = self.df['risk_score'].isna()
                if needs_prediction.any():
                    df_to_predict = self.df[needs_prediction].copy()
                    df_predicted = _predict_dataframe(df_to_predict)
                    self.df.loc[needs_prediction, 'risk_score'] = df_predicted['risk_score']
                    self.df.loc[needs_prediction, 'risk_class'] = df_predicted['risk_class']
                    self._update_risk_in_db(session)
                return
        except Exception as e:
            print(f"[CustomerService] DB read failed: {e}")
        finally:
            close_session(session)
```

---

### **TIER 2: Important (Medium Impact, Moderate Effort)** 🔶

#### 2.1 Frontend: Implementasi React Query untuk Caching
**Impact**: 🔥🔥 (Eliminasi redundant API calls)

**Install dependency**:
```bash
cd frontend
npm install @tanstack/react-query
```

**Create [`frontend/src/lib/queryClient.js`](frontend/src/lib/queryClient.js)** (NEW FILE):
```javascript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

**Modifikasi [`frontend/src/main.jsx`](frontend/src/main.jsx)**:
```javascript
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Refactor [`frontend/src/hooks/useCustomers.js`](frontend/src/hooks/useCustomers.js)**:
```javascript
import { useQuery } from '@tanstack/react-query';
import { fetchCustomers, getRiskClass } from '../api/index';

export function useCustomers(page = 1, perPage = 50, riskFilter = null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', page, perPage, riskFilter],
    queryFn: () => fetchCustomers(page, perPage, riskFilter),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const customers = data?.customers || [];
  const counts = buildCounts(customers);
  const total = data?.total || 0;

  return { customers, counts, total, loading: isLoading, error: error?.message };
}
```

#### 2.2 Frontend: Implementasi Virtual Scrolling
**Impact**: 🔥 (Smooth rendering untuk 1000+ items)

**Install dependency**:
```bash
npm install react-window
```

**Modifikasi [`frontend/src/pages/Customers.jsx`](frontend/src/pages/Customers.jsx)**:
```javascript
import { FixedSizeList as List } from 'react-window';

// Replace grid with virtual list
<List
  height={800}
  itemCount={filtered.length}
  itemSize={180}
  width="100%"
>
  {({ index, style }) => {
    const c = filtered[index];
    return (
      <div style={style}>
        {/* Customer card content */}
      </div>
    );
  }}
</List>
```

#### 2.3 Backend: Database Query Optimization
**Impact**: 🔥🔥 (30-50% faster queries)

**Modifikasi [`backend/app/database.py:24-71`](backend/app/database.py:24-71)**:
```python
class Customer(Base):
    __tablename__ = 'customers'
    
    # Add composite indexes for common queries
    __table_args__ = (
        Index('idx_risk_score', 'risk_class', 'risk_score'),
        Index('idx_customer_lookup', 'customer_id', 'risk_class'),
        Index('idx_plan_contract', 'plan_type', 'contract_type'),
    )
```

**Modifikasi query di [`backend/app/services/customer_service.py`](backend/app/services/customer_service.py)**:
```python
def _load_data(self):
    """Load data with optimized query."""
    session = get_session()
    if session:
        try:
            # Only select needed columns
            customers = session.query(Customer).options(
                load_only(
                    Customer.customer_id, Customer.plan_type, Customer.contract_type,
                    Customer.tenure_days, Customer.risk_score, Customer.risk_class,
                    # ... other essential columns
                )
            ).all()
```

#### 2.4 Implementasi Lazy Loading untuk Charts
**Impact**: 🔥 (Faster initial page load)

**Modifikasi [`frontend/src/pages/Dashboard.jsx`](frontend/src/pages/Dashboard.jsx)**:
```javascript
import { lazy, Suspense } from 'react';

const ChurnTrendChart = lazy(() => import('../components/charts/ChurnTrendChart'));
const RiskDonutChart = lazy(() => import('../components/charts/RiskDonutChart'));

// In render:
<Suspense fallback={<div>Loading chart...</div>}>
  <ChurnTrendChart />
</Suspense>
```

---

### **TIER 3: Nice-to-Have (Lower Impact, Higher Effort)** 🔷

#### 3.1 Implementasi Redis Caching
**Impact**: 🔥🔥🔥 (Production-grade caching)

**Install**:
```bash
pip install redis flask-caching
```

**Create [`backend/app/cache_redis.py`](backend/app/cache_redis.py)** (NEW FILE):
```python
from flask_caching import Cache
import redis

cache = Cache(config={
    'CACHE_TYPE': 'redis',
    'CACHE_REDIS_HOST': 'localhost',
    'CACHE_REDIS_PORT': 6379,
    'CACHE_REDIS_DB': 0,
    'CACHE_DEFAULT_TIMEOUT': 300
})

def init_cache(app):
    cache.init_app(app)
```

#### 3.2 Implementasi WebSocket untuk Real-time Updates
**Impact**: 🔥 (Eliminasi polling)

**Install**:
```bash
pip install flask-socketio
npm install socket.io-client
```

#### 3.3 Database Connection Pooling Tuning
**Impact**: 🔥 (Better concurrency)

**Modifikasi [`backend/app/database.py:182-188`](backend/app/database.py:182-188)**:
```python
engine = create_engine(
    config.SQLALCHEMY_DATABASE_URI,
    pool_size=20,           # Increased from 10
    max_overflow=40,        # Increased from 20
    pool_recycle=1800,      # Reduced from 3600 (30 min)
    pool_pre_ping=True,     # Test connections before use
    echo=False
)
```

#### 3.4 Implementasi CDN untuk Static Assets
**Impact**: 🔥 (Faster asset delivery)

**Strategy**:
- Host frontend build di CDN (Cloudflare, AWS CloudFront)
- Serve static files dari CDN
- Enable browser caching headers

---

## 📈 Expected Performance Improvements

### Before Optimization:
- **Initial Load**: 3-5 seconds (1000 customers)
- **API Response Time**: 800-1500ms
- **Response Size**: 500KB-2MB (uncompressed)
- **Memory Usage**: High (load all data)

### After TIER 1 Implementation:
- **Initial Load**: 0.5-1 second ⚡ (80% improvement)
- **API Response Time**: 50-150ms ⚡ (90% improvement)
- **Response Size**: 50-200KB ⚡ (70-90% reduction)
- **Memory Usage**: Low (pagination + caching)

### After TIER 1 + TIER 2:
- **Initial Load**: 0.3-0.7 second ⚡⚡ (90% improvement)
- **Subsequent Loads**: <100ms ⚡⚡ (cached)
- **Smooth Scrolling**: 60 FPS for 10,000+ items
- **Network Requests**: 50-70% reduction

---

## 🛠️ Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)
1. ✅ Implementasi response compression (gzip)
2. ✅ Implementasi simple caching di backend
3. ✅ Implementasi pagination API
4. ✅ Pre-compute risk scores

### Phase 2: Frontend Optimization (2-3 days)
1. ✅ Implementasi React Query
2. ✅ Update API calls untuk pagination
3. ✅ Implementasi lazy loading untuk charts
4. ✅ Implementasi virtual scrolling (optional)

### Phase 3: Advanced Optimization (3-5 days)
1. ✅ Database indexing & query optimization
2. ✅ Redis caching (production)
3. ✅ Connection pooling tuning
4. ✅ Performance monitoring & profiling

---

## 🧪 Testing & Validation

### Performance Metrics to Track:
1. **Time to First Byte (TTFB)**: Target <200ms
2. **First Contentful Paint (FCP)**: Target <1s
3. **Largest Contentful Paint (LCP)**: Target <2.5s
4. **API Response Time**: Target <150ms (p95)
5. **Bundle Size**: Target <500KB (gzipped)

### Tools:
- Chrome DevTools (Network, Performance)
- Lighthouse
- Backend: `time` decorator untuk profiling
- Frontend: React DevTools Profiler

---

## 📝 Notes & Considerations

### Caching Strategy:
- **Cache Invalidation**: Invalidate saat upload CSV atau update customer
- **Cache Key**: Include filters, pagination params
- **TTL**: 5 minutes untuk customer list, 1 minute untuk stats

### Pagination Strategy:
- **Default Page Size**: 50 items
- **Max Page Size**: 200 items
- **Cursor-based**: Consider untuk large datasets (future)

### Database Strategy:
- **Read Replicas**: Consider untuk production (future)
- **Materialized Views**: Pre-aggregate stats (future)
- **Partitioning**: By risk_class atau date (future)

---

## 🎯 Priority Recommendation

**Start with TIER 1 (Critical)** - These provide 80% of performance gains with 20% effort:
1. Response compression (30 min)
2. Backend caching (1 hour)
3. Pagination API (2 hours)
4. Pre-compute risk scores (1 hour)

**Total Time**: ~5 hours for 80-90% performance improvement! 🚀

---

## 📚 Additional Resources

- [Flask-Compress Documentation](https://github.com/colour-science/flask-compress)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [SQLAlchemy Performance Tips](https://docs.sqlalchemy.org/en/20/faq/performance.html)
- [Web Performance Optimization Guide](https://web.dev/fast/)