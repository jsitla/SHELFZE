import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { t } from '../contexts/translations';

const ShoppingList = () => {
    const { language } = useLanguage();
    const [list, setList] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [loading, setLoading] = useState(true);

    const auth = getAuth();
    const user = auth.currentUser;
    const db = getFirestore();

    useEffect(() => {
        if (user) {
            const shoppingListCollection = collection(db, `users/${user.uid}/shoppingList`);
            const unsubscribe = onSnapshot(shoppingListCollection, (snapshot) => {
                const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setList(items);
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user]);

    const addItem = async () => {
        if (newItem.trim() === '') return;
        await addDoc(collection(db, `users/${user.uid}/shoppingList`), {
            name: newItem,
            checked: false,
        });
        setNewItem('');
    };

    const toggleItemChecked = async (item) => {
        const itemRef = doc(db, `users/${user.uid}/shoppingList`, item.id);
        await updateDoc(itemRef, { checked: !item.checked });
    };

    const clearList = () => {
        Alert.alert(
            t('clearList', language),
            t('clearListMessage', language),
            [
                { text: t('cancel', language), style: 'cancel' },
                {
                    text: t('clear', language),
                    style: 'destructive',
                    onPress: async () => {
                        list.forEach(async (item) => {
                            await deleteDoc(doc(db, `users/${user.uid}/shoppingList`, item.id));
                        });
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={() => toggleItemChecked(item)}>
            <Text style={[styles.itemText, item.checked && styles.itemTextChecked]}>
                {item.checked ? '✓' : '○'} {item.name}
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return <View style={styles.centered}><Text>{t('loading', language)}</Text></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder={t('addItemPlaceholder', language)}
                    value={newItem}
                    onChangeText={setNewItem}
                    onSubmitEditing={addItem}
                />
                <TouchableOpacity style={styles.addButton} onPress={addItem}>
                    <Text style={styles.addButtonText}>{t('add', language)}</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={list}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<View style={styles.centered}><Text>{t('emptyShoppingList', language)}</Text></View>}
            />
            {list.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={clearList}>
                    <Text style={styles.clearButtonText}>{t('clearList', language)}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F1DE', // Alabaster
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    input: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        fontSize: 15,
    },
    addButton: {
        marginLeft: 10,
        backgroundColor: '#4A7C59', // Sage Green
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 80,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    itemContainer: {
        backgroundColor: '#fff',
        padding: 18,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    itemText: {
        fontSize: 15,
        color: '#3D405B', // Charcoal
    },
    itemTextChecked: {
        textDecorationLine: 'line-through',
        color: '#999',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    clearButton: {
        backgroundColor: '#E07A5F', // Terracotta
        padding: 16,
        alignItems: 'center',
        margin: 16,
        borderRadius: 16,
    },
    clearButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default ShoppingList;
