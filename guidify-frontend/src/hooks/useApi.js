/**
 * Custom Hook for API Calls
 * 
 * Abstracts API logic from components using SWR for caching and revalidation.
 * Provides loading states, error handling, and automatic retries.
 */

import { useState, useCallback } from 'react';
import apiClient from '../api/apiClient';

/**
 * Hook for making API requests with loading and error states
 * 
 * @param {Function} apiFunction - The API function to call
 * @returns {Object} - { data, loading, error, execute, reset }
 */
export const useApi = (apiFunction) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (...args) => {
        try {
            setLoading(true);
            setError(null);

            const result = await apiFunction(...args);
            setData(result);
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [apiFunction]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return {
        data,
        loading,
        error,
        execute,
        reset
    };
};

/**
 * Hook for fetching data on mount with automatic loading
 * 
 * @param {string} endpoint - API endpoint to fetch from
 * @param {Object} options - Additional options (params, headers, etc.)
 * @returns {Object} - { data, loading, error, refetch }
 */
export const useFetch = (endpoint, options = {}) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const result = await apiClient.get(endpoint, options);
            setData(result);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [endpoint, options]);

    // Fetch on mount
    useState(() => {
        fetchData();
    }, []);

    return {
        data,
        loading,
        error,
        refetch: fetchData
    };
};

/**
 * Hook for POST requests
 * 
 * @returns {Object} - { data, loading, error, post }
 */
export const usePost = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const post = useCallback(async (endpoint, payload, config = {}) => {
        try {
            setLoading(true);
            setError(null);

            const result = await apiClient.post(endpoint, payload, config);
            setData(result);
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        data,
        loading,
        error,
        post
    };
};

/**
 * Hook for PUT/PATCH requests
 * 
 * @returns {Object} - { data, loading, error, update }
 */
export const useUpdate = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const update = useCallback(async (endpoint, payload, method = 'put', config = {}) => {
        try {
            setLoading(true);
            setError(null);

            const result = await apiClient[method](endpoint, payload, config);
            setData(result);
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        data,
        loading,
        error,
        update
    };
};

/**
 * Hook for DELETE requests
 * 
 * @returns {Object} - { loading, error, remove }
 */
export const useDelete = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const remove = useCallback(async (endpoint, config = {}) => {
        try {
            setLoading(true);
            setError(null);

            await apiClient.delete(endpoint, config);
            return true;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        remove
    };
};

export default useApi;
