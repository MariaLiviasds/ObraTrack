import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Button, FlatList, TextInput, TouchableOpacity, Image, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as MailComposer from 'expo-mail-composer';
import { Picker } from '@react-native-picker/picker';

const Stack = createStackNavigator();

// Tela Home
function HomeScreen({ navigation }) {
  const [obras, setObras] = useState([]);

  useEffect(() => {
    loadObras();
  }, []);

  const loadObras = async () => {
    try {
      const obrasData = await AsyncStorage.getItem('obras');
      if (obrasData) setObras(JSON.parse(obrasData));
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar as obras.');
    }
  };

  const deleteObra = async (id) => {
    const newObras = obras.filter(obra => obra.id !== id);
    setObras(newObras);
    await AsyncStorage.setItem('obras', JSON.stringify(newObras));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ObraTrack - Obras Cadastradas</Text>
      <Button title="Cadastrar Nova Obra" onPress={() => navigation.navigate('CadastroObra', { obra: null })} />
      <FlatList
        data={obras}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.obraItem}>
            <TouchableOpacity onPress={() => navigation.navigate('DetalhesObra', { obraId: item.id })}>
              <Text style={styles.obraText}>{item.nome}</Text>
              <Image source={{ uri: item.foto }} style={styles.thumbnail} />
            </TouchableOpacity>
            <Button title="Excluir" color="red" onPress={() => deleteObra(item.id)} />
          </View>
        )}
      />
    </View>
  );
}

// Tela de Cadastro de Obra
function CadastroObraScreen({ route, navigation }) {
  const { obra } = route.params || { obra: null };
  const [nome, setNome] = useState(obra ? obra.nome : '');
  const [responsavel, setResponsavel] = useState(obra ? obra.responsavel : '');
  const [dataInicio, setDataInicio] = useState(obra ? obra.dataInicio : '');
  const [previsaoTermino, setPrevisaoTermino] = useState(obra ? obra.previsaoTermino : '');
  const [descricao, setDescricao] = useState(obra ? obra.descricao : '');
  const [foto, setFoto] = useState(obra ? obra.foto : null);
  const [localizacao, setLocalizacao] = useState(obra ? obra.localizacao : null);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
    if (cameraStatus !== 'granted' || locationStatus !== 'granted') {
      Alert.alert('Erro', 'Permissões de câmera ou localização não concedidas.');
      return false;
    }
    return true;
  };

  const tirarFoto = async () => {
    if (await requestPermissions()) {
      const result = await ImagePicker.launchCameraAsync();
      if (!result.canceled) setFoto(result.assets[0].uri);
    }
  };

  const obterLocalizacao = async () => {
    if (await requestPermissions()) {
      const location = await Location.getCurrentPositionAsync({});
      setLocalizacao(`${location.coords.latitude}, ${location.coords.longitude}`);
    }
  };

  const salvarObra = async () => {
    if (!nome || !responsavel || !dataInicio || !previsaoTermino || !foto || !localizacao) {
      Alert.alert('Erro', 'Preencha todos os campos e adicione foto/localização.');
      return;
    }
    const novaObra = {
      id: obra ? obra.id : Date.now().toString(),
      nome,
      responsavel,
      dataInicio,
      previsaoTermino,
      descricao,
      foto,
      localizacao,
      fiscalizacoes: obra ? obra.fiscalizacoes : [],
    };
    try {
      const obrasData = await AsyncStorage.getItem('obras');
      let obras = obrasData ? JSON.parse(obrasData) : [];
      if (obra) {
        obras = obras.map(o => (o.id === obra.id ? novaObra : o));
      } else {
        obras.push(novaObra);
      }
      await AsyncStorage.setItem('obras', JSON.stringify(obras));
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a obra.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{obra ? 'Editar Obra' : 'Cadastrar Obra'}</Text>
      <TextInput style={styles.input} placeholder="Nome da obra" value={nome} onChangeText={setNome} />
      <TextInput style={styles.input} placeholder="Responsável" value={responsavel} onChangeText={setResponsavel} />
      <TextInput style={styles.input} placeholder="Data de início (DD/MM/AAAA)" value={dataInicio} onChangeText={setDataInicio} />
      <TextInput style={styles.input} placeholder="Previsão de término (DD/MM/AAAA)" value={previsaoTermino} onChangeText={setPrevisaoTermino} />
      <TextInput style={styles.input} placeholder="Descrição" value={descricao} onChangeText={setDescricao} multiline />
      <Button title="Tirar Foto" onPress={tirarFoto} />
      {foto && <Image source={{ uri: foto }} style={styles.preview} />}
      <Button title="Obter Localização" onPress={obterLocalizacao} />
      {localizacao && <Text>Localização: {localizacao}</Text>}
      <Button title={obra ? 'Salvar Alterações' : 'Salvar Obra'} onPress={salvarObra} />
    </View>
  );
}

// Tela de Cadastro de Fiscalização
function CadastroFiscalizacaoScreen({ route, navigation }) {
  const { obraId } = route.params;
  const [data, setData] = useState('');
  const [status, setStatus] = useState('Em dia');
  const [observacoes, setObservacoes] = useState('');
  const [foto, setFoto] = useState(null);
  const [localizacao, setLocalizacao] = useState(null);

  const tirarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão de câmera não concedida.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync();
    if (!result.canceled) setFoto(result.assets[0].uri);
  };

  const obterLocalizacao = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão de localização não concedida.');
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    setLocalizacao(`${location.coords.latitude}, ${location.coords.longitude}`);
  };

  const salvarFiscalizacao = async () => {
    if (!data || !status || !foto || !localizacao) {
      Alert.alert('Erro', 'Preencha todos os campos e adicione foto/localização.');
      return;
    }
    const novaFiscalizacao = {
      id: Date.now().toString(),
      data,
      status,
      observacoes,
      foto,
      localizacao,
    };
    try {
      const obrasData = await AsyncStorage.getItem('obras');
      let obras = obrasData ? JSON.parse(obrasData) : [];
      const obraIndex = obras.findIndex(o => o.id === obraId);
      if (obraIndex === -1) {
        Alert.alert('Erro', 'Obra não encontrada.');
        return;
      }
      obras[obraIndex].fiscalizacoes = [...(obras[obraIndex].fiscalizacoes || []), novaFiscalizacao];
      await AsyncStorage.setItem('obras', JSON.stringify(obras));
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar a fiscalização.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastrar Fiscalização</Text>
      <TextInput style={styles.input} placeholder="Data (DD/MM/AAAA)" value={data} onChangeText={setData} />
      <Picker selectedValue={status} onValueChange={setStatus} style={styles.input}>
        <Picker.Item label="Em dia" value="Em dia" />
        <Picker.Item label="Atrasada" value="Atrasada" />
        <Picker.Item label="Parada" value="Parada" />
      </Picker>
      <TextInput style={styles.input} placeholder="Observações" value={observacoes} onChangeText={setObservacoes} multiline />
      <Button title="Tirar Foto" onPress={tirarFoto} />
      {foto && <Image source={{ uri: foto }} style={styles.preview} />}
      <Button title="Obter Localização" onPress={obterLocalizacao} />
      {localizacao && <Text>Localização: {localizacao}</Text>}
      <Button title="Salvar Fiscalização" onPress={salvarFiscalizacao} />
    </View>
  );
}

// Tela de Detalhes da Obra
function DetalhesObraScreen({ route, navigation }) {
  const { obraId } = route.params;
  const [obra, setObra] = useState(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadObra();
  }, []);

  const loadObra = async () => {
    try {
      const obrasData = await AsyncStorage.getItem('obras');
      const obras = obrasData ? JSON.parse(obrasData) : [];
      const foundObra = obras.find(o => o.id === obraId);
      if (foundObra) setObra(foundObra);
      else Alert.alert('Erro', 'Obra não encontrada.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar a obra.');
    }
  };

  const enviarEmail = async () => {
    if (!email) {
      Alert.alert('Erro', 'Digite um e-mail válido.');
      return;
    }
    if (!obra) return;
    const fiscalizacoesText = (obra.fiscalizacoes || []).map(f => 
      `Fiscalização ${f.id}:\nData: ${f.data}\nStatus: ${f.status}\nObservações: ${f.observacoes}\nLocalização: ${f.localizacao}\n`
    ).join('\n');
    try {
      await MailComposer.composeAsync({
        recipients: [email],
        subject: `Detalhes da Obra: ${obra.nome}`,
        body: `Nome: ${obra.nome}\nResponsável: ${obra.responsavel}\nData Início: ${obra.dataInicio}\nPrevisão Término: ${obra.previsaoTermino}\nDescrição: ${obra.descricao}\nLocalização: ${obra.localizacao}\n\nFiscalizações:\n${fiscalizacoesText}`,
      });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível enviar o e-mail.');
    }
  };

  if (!obra) return <View><Text>Carregando...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalhes da Obra: {obra.nome}</Text>
      <Image source={{ uri: obra.foto }} style={styles.preview} />
      <Text>Responsável: {obra.responsavel}</Text>
      <Text>Data Início: {obra.dataInicio}</Text>
      <Text>Previsão Término: {obra.previsaoTermino}</Text>
      <Text>Descrição: {obra.descricao}</Text>
      <Text>Localização: {obra.localizacao}</Text>
      <Text style={styles.subtitle}>Fiscalizações:</Text>
      <FlatList
        data={obra.fiscalizacoes || []}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.fiscalizacaoItem}>
            <Text>Data: {item.data}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Observações: {item.observacoes}</Text>
            <Image source={{ uri: item.foto }} style={styles.thumbnail} />
            <Text>Localização: {item.localizacao}</Text>
          </View>
        )}
      />
      <Button title="Cadastrar Fiscalização" onPress={() => navigation.navigate('CadastroFiscalizacao', { obraId })} />
      <Button title="Editar Obra" onPress={() => navigation.navigate('CadastroObra', { obra })} />
      <TextInput style={styles.input} placeholder="E-mail para envio" value={email} onChangeText={setEmail} />
      <Button title="Enviar por E-mail" onPress={enviarEmail} />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CadastroObra" component={CadastroObraScreen} />
        <Stack.Screen name="DetalhesObra" component={DetalhesObraScreen} />
        <Stack.Screen name="CadastroFiscalizacao" component={CadastroFiscalizacaoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5 },
  obraItem: { padding: 10, borderBottomWidth: 1, borderColor: '#ccc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  obraText: { fontSize: 16 },
  fiscalizacaoItem: { padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
  thumbnail: { width: 50, height: 50, marginVertical: 10 },
  preview: { width: 200, height: 200, marginVertical: 10 },
});