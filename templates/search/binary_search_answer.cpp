/**
 * Template: Binary Search on Answer (Busca Binária na Resposta)
 * Complexidade: O(log(Range) * T(check))
 * Espaço: O(1)
 *
 * Gatilhos:
 * - Resposta numérica limitada em um intervalo [low, high]
 * - Função check(x) é monotônica: se x é válido, qualquer y >= x (ou <= x) também é
 * - Otimização de valor mínimo viável (ou máximo viável)
 */

#include <bits/stdc++.h>
using namespace std;

// Exemplo: Função de verificação monotônica
bool check(long long mid, const vector<long long>& arr, long long target) {
    long long count = 0;
    for (auto val : arr) {
        count += mid / val;
        if (count >= target) return true; // Otimização para evitar overflow
    }
    return count >= target;
}

// Busca pelo MENOR valor que satisfaz check(ans) == true
long long binary_search_min(long long low, long long high, const vector<long long>& arr, long long target) {
    long long ans = high;
    while (low <= high) {
        long long mid = low + (high - low) / 2; // Evita overflow de (low+high)
        if (check(mid, arr, target)) {
            ans = mid;
            high = mid - 1; // Tenta encontrar valor menor ainda
        } else {
            low = mid + 1;  // Valor insuficiente, precisa aumentar
        }
    }
    return ans;
}
