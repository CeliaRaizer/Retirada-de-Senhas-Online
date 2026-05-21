import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

const Historico = () => {
    const [dataSelecionada, setDataSelecionada] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [historico, setHistorico] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const buscarHistorico = async (data) => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/senhas/historico?data=${data}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setHistorico(res.data);
        } catch (err) {
            console.error(err);
            setError("Erro ao carregar o histórico.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        buscarHistorico(dataSelecionada);
    }, [dataSelecionada]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h2 className="text-3xl font-bold text-gray-800">📋 Histórico de Atendimentos</h2>
                
                <input
                    type="date"
                    value={dataSelecionada}
                    onChange={(e) => setDataSelecionada(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Estatísticas */}
            {historico && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow text-center">
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="text-4xl font-bold">{historico.total}</p>
                    </div>
                    <div className="bg-green-50 p-6 rounded-2xl shadow text-center">
                        <p className="text-sm text-green-600">Atendidos</p>
                        <p className="text-4xl font-bold text-green-600">{historico.atendidos}</p>
                    </div>
                    <div className="bg-red-50 p-6 rounded-2xl shadow text-center">
                        <p className="text-sm text-red-600">Cancelados</p>
                        <p className="text-4xl font-bold text-red-600">{historico.cancelados}</p>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-2xl shadow text-center">
                        <p className="text-sm text-blue-600">Taxa</p>
                        <p className="text-4xl font-bold text-blue-600">
                            {historico.total > 0 ? Math.round((historico.atendidos / historico.total) * 100) : 0}%
                        </p>
                    </div>
                </div>
            )}

            {/* Tabela */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
                {loading && <p className="text-center py-10">Carregando histórico...</p>}
                {error && <p className="text-red-500 text-center py-10">{error}</p>}

                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left">Senha</th>
                            <th className="px-6 py-4 text-left">Tipo</th>
                            <th className="px-6 py-4 text-left">Status</th>
                            <th className="px-6 py-4 text-left">E-mail</th>
                            <th className="px-6 py-4 text-left">Horário</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {historico?.senhas?.map((s) => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-semibold">{s.numero}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                        s.tipo === 'prioritario' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {s.tipo === 'prioritario' ? 'Prioritário' : 'Normal'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                                        s.status === 'atendido' ? 'bg-green-100 text-green-700' :
                                        s.status === 'cancelado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {s.status === 'atendido' ? '✅ Atendido' : 
                                         s.status === 'cancelado' ? '❌ Cancelado' : s.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{s.email_usuario || '—'}</td>
                                <td className="px-6 py-4 text-gray-500">
                                    {s.created_at ? format(new Date(s.created_at), "HH:mm", { locale: ptBR }) : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {historico?.senhas?.length === 0 && !loading && (
                    <p className="text-center py-16 text-gray-500">Nenhum registro encontrado para esta data.</p>
                )}
            </div>
        </div>
    );
};

export default Historico;