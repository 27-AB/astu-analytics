import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

export const SearchBar = ({ placeholder = "Search analytics, researchers, reports...", onSearch }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { theme } = useTheme();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Mock search data - in production, this would come from API
  const searchData = {
    metrics: [
      { id: 'total-projects', label: 'Total Projects', type: 'metric', route: '/' },
      { id: 'active-projects', label: 'Active Projects', type: 'metric', route: '/' },
      { id: 'total-funding', label: 'Total Funding', type: 'metric', route: '/' },
    ],
    researchers: [
      { id: 'researcher-1', label: 'Dr. Tigist Alemu', type: 'researcher', route: '/researchers' },
      { id: 'researcher-2', label: 'Dr. Fikirte Haile', type: 'researcher', route: '/researchers' },
    ],
    departments: [
      { id: 'dept-1', label: 'Computer Science', type: 'department', route: '/research' },
      { id: 'dept-2', label: 'Electrical Engineering', type: 'department', route: '/research' },
    ],
    reports: [
      { id: 'report-1', label: 'Analytics Report', type: 'report', route: '/reports' },
      { id: 'report-2', label: 'Funding Report', type: 'report', route: '/reports' },
    ],
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    setSelectedIndex(-1);

    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const allItems = Object.values(searchData).flat();
    const filtered = allItems.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setResults(filtered);
    setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleResultClick(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const handleResultClick = (result) => {
    navigate(result.route);
    setIsOpen(false);
    setQuery('');
    setResults([]);
    if (onSearch) onSearch(result);
  };

  const getTypeIcon = (type) => {
    const icons = {
      metric: '📊',
      researcher: '👨‍🔬',
      department: '🏢',
      report: '📄',
    };
    return icons[type] || '📌';
  };

  const getTypeColor = (type) => {
    const colors = {
      metric: '#22d3ee',
      researcher: '#a78bfa',
      department: '#f59e0b',
      report: '#4ade80',
    };
    return colors[type] || '#94a3b8';
  };

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          style={{
            width: '100%',
            padding: '10px 16px 10px 40px',
            background: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 8,
            color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
            fontSize: 14,
            outline: 'none',
            transition: 'all 0.2s',
          }}
        />
        <span style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 16,
        }}>
          🔍
        </span>
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 8,
            background: theme === 'dark' ? '#162030' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 8,
            boxShadow: theme === 'dark' 
              ? '0 10px 40px rgba(0,0,0,0.3)' 
              : '0 10px 40px rgba(0,0,0,0.1)',
            maxHeight: 400,
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {results.map((result, index) => (
            <div
              key={result.id}
              onClick={() => handleResultClick(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                background: selectedIndex === index 
                  ? (theme === 'dark' ? 'rgba(34,211,238,0.1)' : 'rgba(8,145,178,0.1)')
                  : 'transparent',
                transition: 'background 0.15s',
                borderBottom: index < results.length - 1 
                  ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` 
                  : 'none',
              }}
            >
              <span style={{ fontSize: 18 }}>{getTypeIcon(result.type)}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  color: theme === 'dark' ? '#e2e8f0' : '#1e293b',
                  fontSize: 14,
                  fontWeight: 500,
                }}>
                  {highlightMatch(result.label, query)}
                </div>
                <div style={{
                  color: getTypeColor(result.type),
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}>
                  {result.type}
                </div>
              </div>
              <span style={{ fontSize: 12, color: theme === 'dark' ? '#64748b' : '#94a3b8' }}>
                →
              </span>
            </div>
          ))}
          
          {results.length === 0 && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: theme === 'dark' ? '#64748b' : '#94a3b8',
              fontSize: 13,
            }}>
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const highlightMatch = (text, query) => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => 
    regex.test(part) ? (
      <span key={i} style={{ 
        background: 'rgba(34,211,238,0.3)', 
        color: '#22d3ee',
        fontWeight: 600,
        borderRadius: 2,
        padding: '0 2px',
      }}>
        {part}
      </span>
    ) : part
  );
};
