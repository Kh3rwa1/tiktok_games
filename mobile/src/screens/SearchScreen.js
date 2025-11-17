import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gamesAPI } from '../services/api';

export default function SearchScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const categories = [
    { id: 'all', name: 'All', icon: 'grid' },
    { id: 'action', name: 'Action', icon: 'flash' },
    { id: 'puzzle', name: 'Puzzle', icon: 'extension-puzzle' },
    { id: 'adventure', name: 'Adventure', icon: 'compass' },
    { id: 'strategy', name: 'Strategy', icon: 'bulb' },
    { id: 'casual', name: 'Casual', icon: 'happy' },
    { id: 'arcade', name: 'Arcade', icon: 'game-controller' },
  ];

  const handleSearch = async (query = searchQuery, category = selectedCategory) => {
    if (!query && !category) return;

    setLoading(true);
    try {
      const params = {};
      if (query) params.search = query;
      if (category && category !== 'all') params.category = category;

      const response = await gamesAPI.getGames(params);
      setResults(response.data.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    handleSearch(searchQuery, categoryId);
  };

  const handleGamePress = (game) => {
    navigation.navigate('GamePlayer', { game });
  };

  const renderGameItem = ({ item }) => (
    <TouchableOpacity
      style={styles.gameItem}
      onPress={() => handleGamePress(item)}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.gameImage} />
      <View style={styles.gameInfo}>
        <Text style={styles.gameTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.gameDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.gameStats}>
          <View style={styles.statItem}>
            <Ionicons name="play" size={12} color="#999" />
            <Text style={styles.statText}>{item.stats.plays}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={12} color="#FF0050" />
            <Text style={styles.statText}>{item.stats.likes}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.statText}>{item.averageRating?.toFixed(1) || '0.0'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search games..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch()}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setResults([]);
            }}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item.id && styles.categoryChipActive,
              ]}
              onPress={() => handleCategorySelect(item.id)}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={selectedCategory === item.id ? '#fff' : '#999'}
              />
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item.id && styles.categoryTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF0050" />
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderGameItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={64} color="#333" />
              <Text style={styles.emptyText}>
                {searchQuery || selectedCategory
                  ? 'No games found'
                  : 'Search for games or browse categories'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  categoriesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryChipActive: {
    backgroundColor: '#FF0050',
    borderColor: '#FF0050',
  },
  categoryText: {
    color: '#999',
    fontSize: 14,
    marginLeft: 6,
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    padding: 16,
  },
  gameItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  gameImage: {
    width: 100,
    height: 100,
  },
  gameInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  gameTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gameDescription: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  gameStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    color: '#999',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
